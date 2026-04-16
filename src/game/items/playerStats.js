export const BASE_PLAYER_STATS = {
    maxHp: 12,
    attackMin: 2,
    attackMax: 4,
    armor: 0,
};
export const EMPTY_RUN_BONUSES = {
    maxHp: 0,
    attack: 0,
    armor: 0,
};
export const getRunBonusesForLevel = (level) => ({
    maxHp: Math.max(0, level - 1),
    attack: Math.floor(Math.max(0, level - 1) / 2),
    armor: Math.floor(Math.max(0, level - 1) / 3),
});
export const getXpToNextLevel = (level) => 10 + (level - 1) * 6;
export const derivePlayerStats = (inventory, runBonuses = EMPTY_RUN_BONUSES) => {
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
        maxHp: BASE_PLAYER_STATS.maxHp + runBonuses.maxHp,
        attackMin: BASE_PLAYER_STATS.attackMin + attackBonus + runBonuses.attack,
        attackMax: BASE_PLAYER_STATS.attackMax + attackBonus + runBonuses.attack,
        armor: BASE_PLAYER_STATS.armor + armorBonus + runBonuses.armor,
    };
};
