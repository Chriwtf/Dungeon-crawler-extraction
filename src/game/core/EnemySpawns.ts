import type { DungeonData, Point } from '../world/DungeonGenerator';
import { ROOM_ARCHETYPES } from '../world/RoomArchetypes.js';

export type InitialEnemyKind = 'crawler' | 'guard';

export type InitialEnemySpawn = {
  readonly kind: InitialEnemyKind;
  readonly point: Point;
};

/** Pure initial spawn plan, shared by the ECS runtime and seed validation. */
export function planInitialEnemySpawns(dungeon: DungeonData, seed: number): readonly InitialEnemySpawn[] {
  const random = createSeededRandom(seed ^ 0x9e3779b9);
  const spawnedKinds = new Set<InitialEnemyKind>();
  const spawns: InitialEnemySpawn[] = [];

  for (const room of dungeon.rooms) {
    if (spawns.length >= 4) break;
    const profile = ROOM_ARCHETYPES[room.archetype].enemyProfile;
    const kind = profile === 'crawler' ? 'crawler' : profile === 'guard' ? 'guard' : undefined;
    if (kind === undefined || samePoint(room.center, dungeon.playerStart) || random() > ROOM_ARCHETYPES[room.archetype].enemyChance) continue;
    spawns.push({ kind, point: { ...room.center } });
    spawnedKinds.add(kind);
  }

  const fallbackRooms = dungeon.rooms.filter((room) =>
    room.archetype !== 'reliquary' && room.archetype !== 'extractionRoom' && !samePoint(room.center, dungeon.playerStart),
  );
  for (const kind of ['crawler', 'guard'] as const) {
    if (spawnedKinds.has(kind) || spawns.length >= 4) continue;
    const room = fallbackRooms[spawns.length % fallbackRooms.length];
    if (room !== undefined) spawns.push({ kind, point: { ...room.center } });
  }

  return spawns;
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
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
