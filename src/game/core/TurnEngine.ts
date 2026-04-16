export type TurnResult = {
  turn: number;
  logLine: string;
};

export class TurnEngine {
  private turn = 0;

  next(logLine: string): TurnResult {
    this.turn += 1;
    return {
      turn: this.turn,
      logLine,
    };
  }

  get currentTurn(): number {
    return this.turn;
  }
}
