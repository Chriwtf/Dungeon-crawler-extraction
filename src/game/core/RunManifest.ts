import { planInitialEnemySpawns } from './EnemySpawns.js';
import { placeRunContainers } from './RunContainers.js';
import { placeRunLoot } from './RunLoot.js';
import { generateDungeon, type DungeonConfig } from '../world/DungeonGenerator.js';

export const RUN_SEED = 827491;

export const VERTICAL_SLICE_DUNGEON_CONFIG: DungeonConfig = {
  width: 20,
  height: 16,
  targetRooms: 12,
  minRoomSize: 4,
  maxRoomSize: 6,
};

/** All deterministic content chosen before a run begins. */
export function createRunManifest(seed = RUN_SEED) {
  const dungeon = generateDungeon(VERTICAL_SLICE_DUNGEON_CONFIG, seed);
  return {
    dungeon,
    loot: placeRunLoot(dungeon, seed, 5),
    containers: placeRunContainers(dungeon),
    enemySpawns: planInitialEnemySpawns(dungeon, seed),
  };
}

export function runManifestFingerprint(seed: number): string {
  return JSON.stringify(createRunManifest(seed));
}
