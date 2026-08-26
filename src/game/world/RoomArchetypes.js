export const ROOM_ARCHETYPES = {
    crypt: {
        id: 'crypt', minSize: 4, maxSize: 10, weight: 1.2, lootProfile: 'burial', enemyProfile: 'crawler', propProfile: 'sarcophagi', lootChance: 0.55, enemyChance: 0.42,
    },
    storage: {
        id: 'storage', minSize: 4, maxSize: 10, weight: 1.6, lootProfile: 'supplies', enemyProfile: 'none', propProfile: 'crates', lootChance: 0.82, enemyChance: 0.12,
    },
    armory: {
        id: 'armory', minSize: 5, maxSize: 10, weight: 0.9, lootProfile: 'military', enemyProfile: 'guard', propProfile: 'weaponRacks', lootChance: 0.74, enemyChance: 0.5, requirement: 'future iron key',
    },
    prison: {
        id: 'prison', minSize: 5, maxSize: 10, weight: 0.85, lootProfile: 'evidence', enemyProfile: 'crawler', propProfile: 'cells', lootChance: 0.46, enemyChance: 0.56,
    },
    ritual: {
        id: 'ritual', minSize: 5, maxSize: 10, weight: 0.8, lootProfile: 'occult', enemyProfile: 'cultist', propProfile: 'altar', lootChance: 0.7, enemyChance: 0.38, requirement: 'future ritual key',
    },
    library: {
        id: 'library', minSize: 5, maxSize: 10, weight: 1.05, lootProfile: 'archive', enemyProfile: 'none', propProfile: 'shelves', lootChance: 0.76, enemyChance: 0.18,
    },
    guardRoom: {
        id: 'guardRoom', minSize: 4, maxSize: 10, weight: 1.1, lootProfile: 'military', enemyProfile: 'guard', propProfile: 'watchPost', lootChance: 0.5, enemyChance: 0.64,
    },
    reliquary: {
        id: 'reliquary', minSize: 4, maxSize: 12, weight: 0, lootProfile: 'relic', enemyProfile: 'apex', propProfile: 'relicDais', lootChance: 1, enemyChance: 0, specialFunction: 'relic objective',
    },
    extractionRoom: {
        id: 'extractionRoom', minSize: 4, maxSize: 12, weight: 0, lootProfile: 'none', enemyProfile: 'none', propProfile: 'extractionRig', lootChance: 0, enemyChance: 0, specialFunction: 'extraction point',
    },
};
const STANDARD_ARCHETYPES = ['crypt', 'storage', 'armory', 'prison', 'ritual', 'library', 'guardRoom'];
export function assignRoomArchetypes(assignments, random) {
    const assigned = [];
    const requiredVariety = shuffle([...STANDARD_ARCHETYPES], random);
    let varietyIndex = 0;
    for (const room of assignments) {
        if (room.forcedId !== undefined) {
            assigned.push(room.forcedId);
            continue;
        }
        const area = room.width * room.height;
        const variety = requiredVariety.slice(varietyIndex).find((id) => supportsSize(ROOM_ARCHETYPES[id], area));
        if (variety !== undefined) {
            varietyIndex = requiredVariety.indexOf(variety) + 1;
            assigned.push(variety);
            continue;
        }
        const candidates = STANDARD_ARCHETYPES.filter((id) => supportsSize(ROOM_ARCHETYPES[id], area));
        assigned.push(weightedPick(candidates, random));
    }
    return assigned;
}
function supportsSize(archetype, area) {
    return area >= archetype.minSize * archetype.minSize && area <= archetype.maxSize * archetype.maxSize;
}
function weightedPick(candidates, random) {
    const total = candidates.reduce((sum, id) => sum + ROOM_ARCHETYPES[id].weight, 0);
    let threshold = random() * total;
    for (const id of candidates) {
        threshold -= ROOM_ARCHETYPES[id].weight;
        if (threshold <= 0)
            return id;
    }
    return candidates[candidates.length - 1] ?? 'storage';
}
function shuffle(values, random) {
    for (let index = values.length - 1; index > 0; index -= 1) {
        const target = Math.floor(random() * (index + 1));
        [values[index], values[target]] = [values[target], values[index]];
    }
    return values;
}
