import type { DungeonData, Point } from './DungeonGenerator';

export type TileVisibility = 'unknown' | 'explored' | 'visible';

/** Records only player knowledge; rendering and AI consume this without owning exploration state. */
export class ExplorationMemory {
  private readonly states: TileVisibility[][];

  constructor(private readonly dungeon: DungeonData) {
    this.states = Array.from({ length: dungeon.config.height }, () =>
      Array.from({ length: dungeon.config.width }, () => 'unknown' as TileVisibility),
    );
  }

  update(origin: Point, radius: number, isBlocked: (point: Point) => boolean): void {
    for (let y = 0; y < this.states.length; y += 1) {
      for (let x = 0; x < this.states[y].length; x += 1) {
        if (this.states[y][x] === 'visible') this.states[y][x] = 'explored';
      }
    }

    const queue: Array<{ point: Point; distance: number }> = [{ point: origin, distance: 0 }];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      const key = keyOf(current.point);
      if (visited.has(key) || current.distance > radius) continue;
      visited.add(key);
      this.states[current.point.y][current.point.x] = 'visible';

      if (this.dungeon.tiles[current.point.y][current.point.x] === 'wall' || isBlocked(current.point)) continue;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const next = { x: current.point.x + dx, y: current.point.y + dy };
        if (this.dungeon.tiles[next.y]?.[next.x] === undefined) continue;
        queue.push({ point: next, distance: current.distance + 1 });
      }
    }
  }

  get(point: Point): TileVisibility {
    return this.states[point.y]?.[point.x] ?? 'unknown';
  }

  isVisible(point: Point): boolean {
    return this.get(point) === 'visible';
  }

  isExplored(point: Point): boolean {
    return this.get(point) !== 'unknown';
  }
}

function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}
