import type { DungeonData, Point } from '../world/DungeonGenerator';
import { ROOM_ARCHETYPES } from '../world/RoomArchetypes.js';

export type InitialEnemyKind = 'crawler' | 'guard';

export type InitialEnemySpawn = {
  readonly kind: InitialEnemyKind;
  readonly point: Point;
};

/** Pure initial spawn plan, shared by the ECS runtime and seed validation. */
export function planInitialEnemySpawns(
  dungeon: DungeonData,
  seed: number,
  reservedPoints: readonly Point[] = [],
): readonly InitialEnemySpawn[] {
  const random = createSeededRandom(seed ^ 0x9e3779b9);
  const spawnedKinds = new Set<InitialEnemyKind>();
  const spawns: InitialEnemySpawn[] = [];
  const occupied = new Set([
    ...reservedPoints,
    dungeon.playerStart,
    dungeon.objective,
    dungeon.extraction,
    ...dungeon.rooms.map((room) => room.center),
  ].map(pointKey));

  for (const room of dungeon.rooms) {
    if (spawns.length >= 4) break;
    const profile = ROOM_ARCHETYPES[room.archetype].enemyProfile;
    const kind = profile === 'crawler' ? 'crawler' : profile === 'guard' ? 'guard' : undefined;
    if (kind === undefined || random() > ROOM_ARCHETYPES[room.archetype].enemyChance) continue;
    const point = selectSpawnPoint(dungeon, room, occupied);
    if (point === undefined) continue;
    spawns.push({ kind, point });
    spawnedKinds.add(kind);
    occupied.add(pointKey(point));
  }

  const fallbackRooms = dungeon.rooms.filter((room) =>
    room.archetype !== 'reliquary' && room.archetype !== 'extractionRoom' && pointKey(room.center) !== pointKey(dungeon.playerStart),
  );
  for (const kind of ['crawler', 'guard'] as const) {
    if (spawnedKinds.has(kind) || spawns.length >= 4) continue;
    const room = fallbackRooms.find((candidate) => selectSpawnPoint(dungeon, candidate, occupied) !== undefined);
    if (room === undefined) continue;
    const point = selectSpawnPoint(dungeon, room, occupied);
    if (point === undefined) continue;
    spawns.push({ kind, point });
    occupied.add(pointKey(point));
  }

  return spawns;
}

function selectSpawnPoint(
  dungeon: DungeonData,
  room: DungeonData['rooms'][number],
  occupied: ReadonlySet<string>,
): Point | undefined {
  const candidates = [
    { x: room.center.x + 1, y: room.center.y },
    { x: room.center.x - 1, y: room.center.y },
    { x: room.center.x, y: room.center.y + 1 },
    { x: room.center.x, y: room.center.y - 1 },
  ];
  return candidates.find((point) =>
    point.x >= room.x
    && point.x < room.x + room.w
    && point.y >= room.y
    && point.y < room.y + room.h
    && dungeon.tiles[point.y]?.[point.x] === 'floor'
    && !occupied.has(pointKey(point)),
  );
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}
