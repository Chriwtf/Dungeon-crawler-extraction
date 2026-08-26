import { AudioGraph, ambienceBuffer, metalBuffer, noiseBuffer, toneBuffer } from '@driftengine/audio';
/**
 * Game-owned audio adapter. DriftEngine owns the graph and mix; this module only maps
 * run events to a compact temporary synth palette until authored sounds replace it.
 */
export class RunAudio {
    constructor() {
        Object.defineProperty(this, "graph", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "ambient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "buffers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "initializing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
    }
    unlock() {
        if (this.graph !== null) {
            this.graph.wake();
            return;
        }
        if (this.initializing === null)
            this.initializing = this.initialize();
    }
    play(sound) {
        this.graph?.play(this.buffers[sound], sound === 'damage' || sound === 'apex' ? 0.55 : 0.34);
    }
    playTurn(action) {
        const sound = action === 'move' ? 'step'
            : action === 'turn' ? 'turn'
                : action === 'blocked' ? 'locked'
                    : action === 'torch' ? 'turn'
                        : action === 'door' ? 'door'
                            : action === 'attack' ? 'strike'
                                : action === 'heavyAttack' ? 'heavy'
                                    : action === 'guard' ? 'guard'
                                        : action === 'dodge' ? 'dodge'
                                            : 'medkit';
        this.play(sound);
    }
    setTension(facilityMode, hunting, relicSecured) {
        if (this.ambient === null)
            return;
        const intensity = hunting ? 0.2 : facilityMode === 2 ? 0.11 : relicSecured ? 0.14 : facilityMode === 1 ? 0.1 : 0.055;
        this.ambient.setGain(intensity);
        this.ambient.setRate(hunting ? 1.22 : relicSecured ? 1.12 : 1);
    }
    async initialize() {
        const graph = await AudioGraph.create({ stemCount: 0, levels: { music: 0, effects: 0.72 } });
        if (graph === null)
            return;
        this.graph = graph;
        const context = graph.context;
        this.buffers = {
            step: noiseBuffer(context, 0.11, 3.5, () => 0.055),
            turn: toneBuffer(context, 0.08, 210, 170, 3.2),
            door: metalBuffer(context, 0.34, 110, 3.4),
            locked: metalBuffer(context, 0.18, 185, 4.8),
            strike: metalBuffer(context, 0.16, 150, 4.2),
            heavy: metalBuffer(context, 0.36, 72, 2.8),
            guard: metalBuffer(context, 0.22, 270, 4.4),
            dodge: noiseBuffer(context, 0.14, 2.8, () => 0.18),
            medkit: toneBuffer(context, 0.28, 310, 620, 2.2),
            container: metalBuffer(context, 0.3, 135, 3.8),
            loot: toneBuffer(context, 0.18, 460, 720, 2.6),
            damage: noiseBuffer(context, 0.2, 2.4, () => 0.15),
            relic: toneBuffer(context, 0.85, 130, 690, 1.8),
            apex: toneBuffer(context, 0.62, 74, 42, 1.3),
            extract: toneBuffer(context, 0.58, 280, 820, 2),
        };
        this.ambient = graph.createLoop(ambienceBuffer(context, {
            seconds: 5,
            colour: 0.045,
            bodyCut: 0.006,
            swellDepth: 0.32,
            swellCycles: 2,
            transientRate: 0.35,
            transientDecay: 180,
            gain: 0.34,
        }));
        this.setTension(0, false, false);
        graph.wake();
    }
}
