/** Records only player knowledge; rendering and AI consume this without owning exploration state. */
export class ExplorationMemory {
    constructor(dungeon) {
        Object.defineProperty(this, "dungeon", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: dungeon
        });
        Object.defineProperty(this, "states", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.states = Array.from({ length: dungeon.config.height }, () => Array.from({ length: dungeon.config.width }, () => 'unknown'));
    }
    update(origin, radius, isBlocked) {
        for (let y = 0; y < this.states.length; y += 1) {
            for (let x = 0; x < this.states[y].length; x += 1) {
                if (this.states[y][x] === 'visible')
                    this.states[y][x] = 'explored';
            }
        }
        const queue = [{ point: origin, distance: 0 }];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (current === undefined)
                break;
            const key = keyOf(current.point);
            if (visited.has(key) || current.distance > radius)
                continue;
            visited.add(key);
            this.states[current.point.y][current.point.x] = 'visible';
            if (this.dungeon.tiles[current.point.y][current.point.x] === 'wall' || isBlocked(current.point))
                continue;
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const next = { x: current.point.x + dx, y: current.point.y + dy };
                if (this.dungeon.tiles[next.y]?.[next.x] === undefined)
                    continue;
                queue.push({ point: next, distance: current.distance + 1 });
            }
        }
    }
    get(point) {
        return this.states[point.y]?.[point.x] ?? 'unknown';
    }
    isVisible(point) {
        return this.get(point) === 'visible';
    }
    isExplored(point) {
        return this.get(point) !== 'unknown';
    }
}
function keyOf(point) {
    return `${point.x},${point.y}`;
}
