import { planInitialEnemySpawns } from './EnemySpawns.js';
import { placeRunContainers } from './RunContainers.js';
import { placeRunLoot } from './RunLoot.js';
import { generateDungeon } from '../world/DungeonGenerator.js';
export const RUN_SEED = 827491;
export const VERTICAL_SLICE_DUNGEON_CONFIG = {
    width: 26,
    height: 20,
    targetRooms: 10,
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
export function runManifestFingerprint(seed) {
    return JSON.stringify(createRunManifest(seed));
}
