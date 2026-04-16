export class TurnEngine {
    constructor() {
        Object.defineProperty(this, "turn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    next(logLine) {
        this.turn += 1;
        return {
            turn: this.turn,
            logLine,
        };
    }
    get currentTurn() {
        return this.turn;
    }
}
