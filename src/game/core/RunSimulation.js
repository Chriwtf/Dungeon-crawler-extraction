import { TurnEngine } from './TurnEngine';
const ACTION_NOISE = {
    move: 1,
    turn: 0,
    blocked: 2,
    torch: 2,
    door: 4,
    attack: 2,
    heavyAttack: 5,
    guard: 0,
    dodge: 1,
    item: 1,
};
const PRESSURE_HINTS = [
    'The ventilation hum changes pitch.',
    'A light clicks somewhere beyond the next room.',
    'Something metallic settles in the dark.',
    'The corridor seems quieter than it should be.',
];
/**
 * Game-side deterministic state. Rendering, sound and enemy AI consume these events but never
 * decide a turn themselves, keeping a run reproducible from its seed and action sequence.
 */
export class RunSimulation {
    constructor(seed) {
        Object.defineProperty(this, "seed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: seed
        });
        Object.defineProperty(this, "turns", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new TurnEngine()
        });
        Object.defineProperty(this, "randomState", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "pressureValue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "noiseLevelValue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this.randomState = seed >>> 0 || 0x9e3779b9;
    }
    get turn() {
        return this.turns.currentTurn;
    }
    get pressure() {
        return this.pressureValue;
    }
    get noiseLevel() {
        return this.noiseLevelValue;
    }
    advance(action, message, carriedWeight = 0, cargoNoiseReduction = 0) {
        // Cargo should make a long detour tense, not make a single light item punitive.
        const cargoNoise = action === 'move' ? Math.max(0, Math.ceil(carriedWeight / 3) - cargoNoiseReduction) : 0;
        const noise = ACTION_NOISE[action] + cargoNoise;
        const turn = this.turns.next(message).turn;
        this.noiseLevelValue = Math.min(20, Math.max(0, this.noiseLevelValue - 1) + noise);
        // Quiet exploration has time to breathe; noise and protracted runs create the real debt.
        const pressureGain = 0.6 + noise * 0.8 + Math.max(0, this.noiseLevelValue - 3) * 0.25 + Math.floor(turn / 10) * 0.35;
        this.pressureValue = Math.min(100, this.pressureValue + pressureGain);
        const hint = this.pressureValue >= 18 && this.roll() < Math.min(0.65, this.pressureValue / 120)
            ? ` ${PRESSURE_HINTS[Math.floor(this.roll() * PRESSURE_HINTS.length)]}`
            : '';
        return { turn, noise, noiseLevel: this.noiseLevelValue, pressure: this.pressureValue, message: `${message}${hint}` };
    }
    roll() {
        let state = this.randomState;
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        this.randomState = state >>> 0;
        return this.randomState / 4294967296;
    }
}
