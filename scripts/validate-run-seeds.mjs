import { createRunManifest, runManifestFingerprint } from '../src/game/core/RunManifest.js';

const seeds = [1, 827491, 13371337, 0xdecafbad, 0x7fffffff];

for (const seed of seeds) {
  const first = runManifestFingerprint(seed);
  const second = runManifestFingerprint(seed);
  if (first !== second) throw new Error(`Seed ${seed} produced different manifests.`);

  const run = createRunManifest(seed);
  const { dungeon } = run;
  const traversable = (point) => dungeon.tiles[point.y]?.[point.x] !== undefined && dungeon.tiles[point.y][point.x] !== 'wall';
  const required = [dungeon.playerStart, dungeon.objective, dungeon.extraction, ...run.loot.map((loot) => loot.point), ...run.containers.map((container) => container.point), ...run.enemySpawns.map((enemy) => enemy.point)];
  if (!required.every(traversable)) throw new Error(`Seed ${seed} placed content in a wall.`);
  const reserved = [dungeon.playerStart, dungeon.objective, dungeon.extraction, ...dungeon.rooms.map((room) => room.center), ...run.loot.map((loot) => loot.point), ...run.containers.map((container) => container.point)];
  const reservedKeys = new Set(reserved.map(keyOf));
  if (run.enemySpawns.some((enemy) => reservedKeys.has(keyOf(enemy.point)))) throw new Error(`Seed ${seed} spawned an enemy inside a reserved prop or objective tile.`);
  if (new Set(run.enemySpawns.map((enemy) => keyOf(enemy.point))).size !== run.enemySpawns.length) throw new Error(`Seed ${seed} spawned enemies on the same tile.`);
  if (new Set(dungeon.doors.map((door) => door.id)).size !== dungeon.doors.length) throw new Error(`Seed ${seed} produced duplicate doors.`);
  if (run.enemySpawns.length < 2 || run.enemySpawns.length > 4) throw new Error(`Seed ${seed} produced an invalid enemy count.`);
}

console.log(`Validated deterministic run manifests for ${seeds.length} seeds.`);

function keyOf(point) {
  return `${point.x},${point.y}`;
}
