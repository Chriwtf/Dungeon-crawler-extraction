import { BASE_INVENTORY_SIZE, getInventorySizeBonus, type Item } from './inventory';

export type PlayerStats = {
  maxHp: number;
  attackMin: number;
  attackMax: number;
  armor: number;
  inventorySize: number;
};

export type RunProgressionBonuses = {
  maxHp: number;
  attack: number;
  armor: number;
};

export const BASE_PLAYER_STATS: PlayerStats = {
  maxHp: 12,
  attackMin: 2,
  attackMax: 4,
  armor: 0,
  inventorySize: BASE_INVENTORY_SIZE,
};

export const EMPTY_RUN_BONUSES: RunProgressionBonuses = {
  maxHp: 0,
  attack: 0,
  armor: 0,
};

export const getRunBonusesForLevel = (level: number): RunProgressionBonuses => ({
  maxHp: Math.max(0, level - 1),
  attack: Math.floor(Math.max(0, level - 1) / 2),
  armor: Math.floor(Math.max(0, level - 1) / 3),
});

export const getXpToNextLevel = (level: number): number => 10 + (level - 1) * 6;

export const derivePlayerStats = (
  inventory: Array<Item | null>,
  runBonuses: RunProgressionBonuses = EMPTY_RUN_BONUSES,
  backpack: Item | null = null,
): PlayerStats => {
  let attackBonus = 0;
  let armorBonus = 0;

  for (const item of [...inventory, backpack]) {
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
    inventorySize: BASE_PLAYER_STATS.inventorySize + getInventorySizeBonus([...inventory, backpack]),
  };
};
