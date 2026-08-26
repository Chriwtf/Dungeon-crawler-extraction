import { TurnEngine } from './TurnEngine';

export type RunAction = 'move' | 'turn' | 'blocked' | 'torch' | 'door' | 'attack' | 'heavyAttack' | 'guard' | 'dodge' | 'item';

export type RunEvent = {
  readonly turn: number;
  readonly noise: number;
  readonly noiseLevel: number;
  readonly pressure: number;
  readonly message: string;
};

const ACTION_NOISE: Record<RunAction, number> = {
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
] as const;

/**
 * Game-side deterministic state. Rendering, sound and enemy AI consume these events but never
 * decide a turn themselves, keeping a run reproducible from its seed and action sequence.
 */
export class RunSimulation {
  private readonly turns = new TurnEngine();
  private randomState: number;
  private pressureValue = 0;
  private noiseLevelValue = 0;

  constructor(readonly seed: number) {
    this.randomState = seed >>> 0 || 0x9e3779b9;
  }

  get turn(): number {
    return this.turns.currentTurn;
  }

  get pressure(): number {
    return this.pressureValue;
  }

  get noiseLevel(): number {
    return this.noiseLevelValue;
  }

  advance(action: RunAction, message: string, carriedWeight = 0, cargoNoiseReduction = 0): RunEvent {
    const cargoNoise = action === 'move' ? Math.max(0, Math.floor(carriedWeight / 2) - cargoNoiseReduction) : 0;
    const noise = ACTION_NOISE[action] + cargoNoise;
    const turn = this.turns.next(message).turn;
    this.noiseLevelValue = Math.min(20, Math.max(0, this.noiseLevelValue - 1) + noise);
    this.pressureValue = Math.min(100, this.pressureValue + 1 + noise * 2 + Math.floor(this.noiseLevelValue / 5) + Math.floor(turn / 8));
    const hint = this.pressureValue >= 18 && this.roll() < Math.min(0.65, this.pressureValue / 120)
      ? ` ${PRESSURE_HINTS[Math.floor(this.roll() * PRESSURE_HINTS.length)]}`
      : '';

    return { turn, noise, noiseLevel: this.noiseLevelValue, pressure: this.pressureValue, message: `${message}${hint}` };
  }

  private roll(): number {
    let state = this.randomState;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.randomState = state >>> 0;
    return this.randomState / 0x1_0000_0000;
  }
}
