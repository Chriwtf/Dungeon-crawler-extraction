import type { DungeonData, Point } from '../world/DungeonGenerator';
import { loadModule } from 'driftscript';
import { isNoiseAudibleAt, type NoisePulse } from './NoiseSystem';
import { findStepToward, samePoint } from '../world/DungeonPathfinding';
import * as apexBrainScript from '../../drift/scripts/ApexBrain.drs';

export type ApexMode = 'dormant' | 'searching' | 'hunting';

export type ApexEvent = {
  readonly mode: ApexMode;
  readonly position: Point;
  readonly captured: boolean;
  readonly visible: boolean;
  readonly message: string | null;
};

/** A deterministic hearing-first stalker. It never reads renderer state or player inputs directly. */
export class ApexDirector {
  private modeValue: ApexMode = 'dormant';
  private target: Point | null = null;
  private readonly positionValue: Point;
  private readonly mind: ApexMind;
  private readonly advanceMind: (mind: ApexMind, pressure: number, turn: number, pulse: number, heard: boolean, relicSecured: boolean) => void;

  constructor(dungeon: DungeonData) {
    this.positionValue = findFarthestFloor(dungeon, dungeon.playerStart);
    const module = loadModule(apexBrainScript as unknown as Record<string, unknown>);
    this.mind = (module.exports.createApexMind as () => ApexMind)();
    this.advanceMind = module.exports.advance as (mind: ApexMind, pressure: number, turn: number, pulse: number, heard: boolean, relicSecured: boolean) => void;
  }

  advance(dungeon: DungeonData, player: Point, pulse: NoisePulse, pressure: number, turn: number, torchOn: boolean, relicSecured = false): ApexEvent {
    const heardPlayer = pulse.intensity > 0 && isNoiseAudibleAt(pulse, this.positionValue);
    const wasDormant = this.modeValue === 'dormant';
    this.advanceMind(this.mind, pressure, turn, pulse.intensity, heardPlayer, relicSecured);
    this.modeValue = modeFromScript(this.mind.mode);
    let message: string | null = null;

    if (wasDormant && this.modeValue === 'searching') {
      this.target = player;
      message = 'Something answers the noise from deeper in the facility.';
    }
    if (this.modeValue === 'hunting' && (heardPlayer || relicSecured)) {
      this.target = player;
      message = relicSecured ? 'THE RELIC SIGNAL WAKES THE APEX.' : 'The Apex heard that.';
    }
    if (this.modeValue !== 'dormant' && this.target !== null) {
      const next = findStepToward(dungeon, this.positionValue, this.target);
      this.positionValue.x = next.x;
      this.positionValue.y = next.y;
      if (samePoint(this.positionValue, this.target) && this.modeValue === 'searching') this.target = null;
    }

    const captured = samePoint(this.positionValue, player);
    const distance = Math.abs(this.positionValue.x - player.x) + Math.abs(this.positionValue.y - player.y);
    const visible = this.modeValue !== 'dormant' && torchOn && distance <= 4;
    return { mode: this.modeValue, position: { ...this.positionValue }, captured, visible, message };
  }
}

interface ApexMind {
  mode: number;
}

function modeFromScript(mode: number): ApexMode {
  if (mode >= 2) return 'hunting';
  if (mode >= 1) return 'searching';
  return 'dormant';
}

function findFarthestFloor(dungeon: DungeonData, from: Point): Point {
  let farthest = { ...from };
  let distance = -1;
  for (let y = 0; y < dungeon.tiles.length; y += 1) {
    for (let x = 0; x < dungeon.tiles[y].length; x += 1) {
      if (dungeon.tiles[y][x] === 'wall') continue;
      const candidateDistance = Math.abs(x - from.x) + Math.abs(y - from.y);
      if (candidateDistance > distance) { farthest = { x, y }; distance = candidateDistance; }
    }
  }
  return farthest;
}
