import { ROOM_ARCHETYPES } from '../world/RoomArchetypes';
const LOOT_TABLE = [
    { kind: 'document', name: 'Classified dossier', value: 180, weight: 1 },
    { kind: 'sample', name: 'Biological sample', value: 310, weight: 2 },
    { kind: 'component', name: 'Calibrated component', value: 460, weight: 3 },
    { kind: 'artifact', name: 'Unidentified fragment', value: 720, weight: 4 },
];
const LOOT_PROFILES = {
    archive: ['document', 'artifact'],
    burial: ['artifact', 'document'],
    evidence: ['document', 'sample'],
    military: ['component', 'sample'],
    occult: ['artifact', 'sample'],
    supplies: ['sample', 'component'],
};
export function placeRunLoot(dungeon, seed, count = 4) {
    const candidates = [];
    for (let y = 0; y < dungeon.tiles.length; y += 1) {
        for (let x = 0; x < dungeon.tiles[y].length; x += 1) {
            if (dungeon.tiles[y][x] !== 'floor')
                continue;
            if (x === dungeon.playerStart.x && y === dungeon.playerStart.y)
                continue;
            const room = dungeon.rooms.find((candidate) => x >= candidate.x && x < candidate.x + candidate.w && y >= candidate.y && y < candidate.y + candidate.h);
            const archetype = room === undefined ? undefined : ROOM_ARCHETYPES[room.archetype];
            candidates.push({
                point: { x, y },
                roomId: room?.id,
                lootProfile: archetype?.lootProfile,
                weight: archetype?.lootChance ?? 0.2,
            });
        }
    }
    const random = createSeededRandom(seed ^ 0x51f15e);
    const selected = [];
    while (selected.length < count && candidates.length > 0) {
        const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
        let threshold = random() * totalWeight;
        let selectedIndex = candidates.length - 1;
        for (let index = 0; index < candidates.length; index += 1) {
            threshold -= candidates[index].weight;
            if (threshold <= 0) {
                selectedIndex = index;
                break;
            }
        }
        const [candidate] = candidates.splice(selectedIndex, 1);
        const allowedKinds = candidate.lootProfile === undefined ? undefined : LOOT_PROFILES[candidate.lootProfile];
        const entries = allowedKinds === undefined ? LOOT_TABLE : LOOT_TABLE.filter((entry) => allowedKinds.includes(entry.kind));
        const entry = entries[Math.floor(random() * entries.length)];
        selected.push({ id: `loot-${selected.length}`, ...entry, point: candidate.point });
    }
    return selected;
}
function createSeededRandom(seed) {
    let state = seed >>> 0 || 0x9e3779b9;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}
