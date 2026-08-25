import type { DungeonData, Point } from '../world/DungeonGenerator';

export type NoisePulse = {
  readonly origin: Point;
  readonly intensity: number;
  readonly radiusTiles: number;
  readonly reachedTiles: number;
};

/**
 * Computes the traversable acoustic field for a turn. Future enemies consume the same pulse
 * instead of using line-of-sight or renderer data, keeping hearing deterministic and testable.
 */
export function propagateNoise(dungeon: DungeonData, origin: Point, intensity: number, noiseLevel: number): NoisePulse {
  const radiusTiles = intensity === 0 ? 0 : Math.min(8, Math.max(intensity, Math.ceil(noiseLevel / 2)));
  if (radiusTiles === 0) return { origin, intensity, radiusTiles, reachedTiles: 0 };

  const queue: Array<{ point: Point; distance: number }> = [{ point: origin, distance: 0 }];
  const visited = new Set<string>([keyOf(origin)]);
  let reachedTiles = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    reachedTiles += 1;
    if (current.distance >= radiusTiles) continue;

    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const next = { x: current.point.x + dx, y: current.point.y + dy };
      if (dungeon.tiles[next.y]?.[next.x] === undefined || dungeon.tiles[next.y][next.x] === 'wall') continue;
      const key = keyOf(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ point: next, distance: current.distance + 1 });
    }
  }

  return { origin, intensity, radiusTiles, reachedTiles };
}

function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}
