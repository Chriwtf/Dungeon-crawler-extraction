import type { DungeonData, Point } from './DungeonGenerator';

export function findStepToward(dungeon: DungeonData, from: Point, target: Point, isBlocked: (point: Point) => boolean = () => false): Point {
  if (samePoint(from, target)) return from;
  const queue: Point[] = [{ ...from }];
  const previous = new Map<string, Point>();
  const visited = new Set<string>([keyOf(from)]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || samePoint(current, target)) break;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (dungeon.tiles[next.y]?.[next.x] === undefined || dungeon.tiles[next.y][next.x] === 'wall' || isBlocked(next)) continue;
      const key = keyOf(next);
      if (visited.has(key)) continue;
      visited.add(key);
      previous.set(key, current);
      queue.push(next);
    }
  }

  if (!visited.has(keyOf(target))) return from;
  let step = { ...target };
  let parent = previous.get(keyOf(step));
  while (parent !== undefined && !samePoint(parent, from)) {
    step = parent;
    parent = previous.get(keyOf(step));
  }
  return step;
}

export function hasLineOfSight(dungeon: DungeonData, from: Point, target: Point): boolean {
  if (from.x !== target.x && from.y !== target.y) return false;
  const dx = Math.sign(target.x - from.x);
  const dy = Math.sign(target.y - from.y);
  let point = { x: from.x + dx, y: from.y + dy };
  while (!samePoint(point, target)) {
    if (dungeon.tiles[point.y]?.[point.x] === undefined || dungeon.tiles[point.y][point.x] === 'wall') return false;
    point = { x: point.x + dx, y: point.y + dy };
  }
  return dungeon.tiles[target.y]?.[target.x] !== undefined && dungeon.tiles[target.y][target.x] !== 'wall';
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}
