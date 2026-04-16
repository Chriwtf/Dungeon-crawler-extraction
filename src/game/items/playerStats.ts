import type { Item } from './inventory';

export type PlayerStats = {
  maxHp: number;
  attackMin: number;
  attackMax: number;
  armor: number;
};

export const BASE_PLAYER_STATS: PlayerStats = {
  maxHp: 12,
  attackMin: 2,
  attackMax: 4,
  armor: 0,
};

export const derivePlayerStats = (inventory: Array<Item | null>): PlayerStats => {
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
