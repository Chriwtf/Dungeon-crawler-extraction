export const BASE_PLAYER_STATS = {
    maxHp: 12,
    attackMin: 2,
    attackMax: 4,
    armor: 0,
};
export const derivePlayerStats = (inventory) => {
    let attackBonus = 0;
    let armorBonus = 0;
    for (const item of inventory) {
        if (!item) {
            continue;
        }
        attackBonus += item.attackBonus ?? 0;
        armorBonus += item.armorBonus ?? 0;
    }
    return {
        maxHp: BASE_PLAYER_STATS.maxHp,
        attackMin: BASE_PLAYER_STATS.attackMin + attackBonus,
        attackMax: BASE_PLAYER_STATS.attackMax + attackBonus,
        armor: BASE_PLAYER_STATS.armor + armorBonus,
    };
};
