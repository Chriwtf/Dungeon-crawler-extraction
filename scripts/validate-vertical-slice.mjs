import { createRunManifest, RUN_SEED } from '../src/game/core/RunManifest.js';

const run = createRunManifest(RUN_SEED);
const { dungeon } = run;
const archetypes = new Set(dungeon.rooms.map((room) => room.archetype));
const enemyKinds = new Set(run.enemySpawns.map((enemy) => enemy.kind));
const containerKinds = new Set(run.containers.map((container) => container.kind));

if (dungeon.rooms.length < 8) throw new Error('Vertical slice needs at least eight rooms.');
if (archetypes.size < 5) throw new Error('Vertical slice needs at least five room archetypes.');
if (!dungeon.connections.some((connection) => connection.kind === 'sidePath') || !dungeon.connections.some((connection) => connection.kind === 'shortcut') || !dungeon.connections.some((connection) => connection.kind === 'rewardDeadEnd')) {
  throw new Error('Vertical slice is missing required branching paths.');
}
if (dungeon.doors.length === 0 || !dungeon.doors.some((door) => door.state === 'locked')) throw new Error('Vertical slice needs an interactive locked door.');
if (run.loot.length !== 5 || !containerKinds.has('keyLocker') || !containerKinds.has('medCache')) throw new Error('Vertical slice is missing reward content.');
if (!enemyKinds.has('crawler') || !enemyKinds.has('guard')) throw new Error('Vertical slice needs both normal enemy types.');
if (!dungeon.rooms.some((room) => room.archetype === 'reliquary') || !dungeon.rooms.some((room) => room.archetype === 'extractionRoom')) {
  throw new Error('Vertical slice is missing a reliquary or extraction room.');
}
if (!isReachable(dungeon.playerStart, dungeon.objective) || !isReachable(dungeon.objective, dungeon.extraction)) {
  throw new Error('Vertical slice route is not completable after unlocking doors.');
}

console.log(`Validated final vertical slice for seed ${RUN_SEED}.`);

function isReachable(from, target) {
  const queue = [{ ...from }];
  const visited = new Set([keyOf(from)]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === target.x && current.y === target.y) return true;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (dungeon.tiles[next.y]?.[next.x] === undefined || dungeon.tiles[next.y][next.x] === 'wall' || visited.has(keyOf(next))) continue;
      visited.add(keyOf(next));
      queue.push(next);
    }
  }
  return false;
}

function keyOf(point) {
  return `${point.x},${point.y}`;
}
