import { loadModule } from 'driftscript';
import { isNoiseAudibleAt } from './NoiseSystem';
import { findStepToward, samePoint } from '../world/DungeonPathfinding';
import * as apexBrainScript from '../../drift/scripts/ApexBrain.drs';
/** A deterministic hearing-first stalker. It never reads renderer state or player inputs directly. */
export class ApexDirector {
    constructor(dungeon) {
        Object.defineProperty(this, "modeValue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'dormant'
        });
        Object.defineProperty(this, "target", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "positionValue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "mind", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "advanceMind", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.positionValue = findFarthestFloor(dungeon, dungeon.playerStart);
        const module = loadModule(apexBrainScript);
        this.mind = module.exports.createApexMind();
        this.advanceMind = module.exports.advance;
    }
    advance(dungeon, player, pulse, pressure, turn, torchOn) {
        const heardPlayer = pulse.intensity > 0 && isNoiseAudibleAt(pulse, this.positionValue);
        const wasDormant = this.modeValue === 'dormant';
        this.advanceMind(this.mind, pressure, turn, pulse.intensity, heardPlayer);
        this.modeValue = modeFromScript(this.mind.mode);
        let message = null;
        if (wasDormant && this.modeValue === 'searching') {
            this.target = player;
            message = 'Something answers the noise from deeper in the facility.';
        }
        if (this.modeValue === 'hunting' && heardPlayer) {
            this.target = player;
            message = 'The Apex heard that.';
        }
        if (this.modeValue !== 'dormant' && this.target !== null) {
            const next = findStepToward(dungeon, this.positionValue, this.target);
            this.positionValue.x = next.x;
            this.positionValue.y = next.y;
            if (samePoint(this.positionValue, this.target) && this.modeValue === 'searching')
                this.target = null;
        }
        const captured = samePoint(this.positionValue, player);
        const distance = Math.abs(this.positionValue.x - player.x) + Math.abs(this.positionValue.y - player.y);
        const visible = this.modeValue !== 'dormant' && torchOn && distance <= 4;
        return { mode: this.modeValue, position: { ...this.positionValue }, captured, visible, message };
    }
}
function modeFromScript(mode) {
    if (mode >= 2)
        return 'hunting';
    if (mode >= 1)
        return 'searching';
    return 'dormant';
}
function findFarthestFloor(dungeon, from) {
    let farthest = { ...from };
    let distance = -1;
    for (let y = 0; y < dungeon.tiles.length; y += 1) {
        for (let x = 0; x < dungeon.tiles[y].length; x += 1) {
            if (dungeon.tiles[y][x] === 'wall')
                continue;
            const candidateDistance = Math.abs(x - from.x) + Math.abs(y - from.y);
            if (candidateDistance > distance) {
                farthest = { x, y };
                distance = candidateDistance;
            }
        }
    }
    return farthest;
}
