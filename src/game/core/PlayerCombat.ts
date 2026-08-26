export type CombatStance = 'none' | 'guard' | 'dodge';

export type CombatResolution = {
  readonly damage: number;
  readonly avoided: boolean;
  readonly guarded: boolean;
  readonly defeated: boolean;
};

/** Deterministic player-side combat state; enemies remain owned by the ECS director. */
export class PlayerCombat {
  readonly maxHp = 36;
  private hpValue = this.maxHp;
  private medkitsValue = 2;
  private stance: CombatStance = 'none';
  private randomState: number;

  constructor(seed: number) {
    this.randomState = (seed ^ 0x51f15e) >>> 0 || 0x6d2b79f5;
  }

  get hp(): number { return this.hpValue; }
  get medkits(): number { return this.medkitsValue; }

  attack(heavy: boolean): { readonly hit: boolean; readonly damage: number } {
    const hit = !heavy || this.roll() < 0.72;
    return { hit, damage: heavy ? 21 + Math.floor(this.roll() * 5) : 10 + Math.floor(this.roll() * 4) };
  }

  guard(): void { this.stance = 'guard'; }
  dodge(): void { this.stance = 'dodge'; }

  useMedkit(): number {
    if (this.medkitsValue <= 0 || this.hpValue >= this.maxHp) return 0;
    this.medkitsValue -= 1;
    const recovered = Math.min(15, this.maxHp - this.hpValue);
    this.hpValue += recovered;
    return recovered;
  }

  resolveIncoming(damage: number): CombatResolution {
    const stance = this.stance;
    this.stance = 'none';
    if (damage <= 0) return { damage: 0, avoided: false, guarded: false, defeated: false };
    if (stance === 'dodge' && this.roll() < 0.65) return { damage: 0, avoided: true, guarded: false, defeated: false };
    const applied = stance === 'guard' ? Math.max(1, Math.ceil(damage * 0.4)) : damage;
    this.hpValue = Math.max(0, this.hpValue - applied);
    return { damage: applied, avoided: false, guarded: stance === 'guard', defeated: this.hpValue === 0 };
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
