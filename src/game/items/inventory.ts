import type { Point, TileGrid } from '../world/DungeonGenerator';

export const BASE_INVENTORY_SIZE = 4;

export type ItemCategory = 'consumable' | 'weapon' | 'armor' | 'backpack';
export type ItemKind =
  | 'medkit'
  | 'ember-bomb'
  | 'stim-pack'
  | 'bandage-roll'
  | 'shock-orb'
  | 'rusted-blade'
  | 'scrap-armor'
  | 'field-medkit'
  | 'inferno-charge'
  | 'steel-blade'
  | 'plate-armor'
  | 'serrated-pike'
  | 'relic-cleaver'
  | 'reinforced-mail'
  | 'bulwark-shell'
  | 'courier-pack'
  | 'scavenger-pack'
  | 'expedition-pack'
  | 'hauler-rig'
  | 'vault-frame';

export type Item = {
  id: string;
  kind: ItemKind;
  category: ItemCategory;
  name: string;
  glyph: string;
  color: number;
  description: string;
  healAmount?: number;
  damageAmount?: number;
  attackBonus?: number;
  armorBonus?: number;
  inventoryBonus?: number;
};

export type GroundItem = {
  item: Item;
  position: Point;
};

export type StoredItem = Omit<Item, 'color'> & {
  color: number;
};

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const swapIndex = randomBetween(0, i);
    [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
  }

  return copy;
};

let nextItemId = 0;

const buildItemId = (): string => {
  nextItemId += 1;
  return `item-${nextItemId}`;
};

export const createItem = (kind: ItemKind, id = buildItemId()): Item => {
  switch (kind) {
    case 'bandage-roll':
      return {
        id,
        kind,
        category: 'consumable',
        name: 'rotolo di bende',
        glyph: '!',
        color: 0xa8efff,
        description: 'Recuperi 3 HP.',
        healAmount: 3,
      };
    case 'shock-orb':
      return {
        id,
        kind,
        category: 'consumable',
        name: 'sfera elettrostatica',
        glyph: '*',
        color: 0x8cc7ff,
        description: 'Scarica sui mostri adiacenti e infligge 4 danni.',
        damageAmount: 4,
      };
    case 'field-medkit':
      return {
        id,
        kind,
        category: 'consumable',
        name: 'medkit da campo',
        glyph: '!',
        color: 0x5bf0ff,
        description: 'Recuperi 6 HP. Drop piu raro dei piani profondi.',
        healAmount: 6,
      };
    case 'inferno-charge':
      return {
        id,
        kind,
        category: 'consumable',
        name: 'carica infernale',
        glyph: '*',
        color: 0xff9c42,
        description: 'Esplode in mischia e infligge 5 danni ai mostri adiacenti.',
        damageAmount: 5,
      };
    case 'steel-blade':
      return {
        id,
        kind,
        category: 'weapon',
        name: 'lama in acciaio',
        glyph: ')',
        color: 0xf4e5a1,
        description: 'Bonus passivo: +2 danni finche resta nello zaino.',
        attackBonus: 2,
      };
    case 'plate-armor':
      return {
        id,
        kind,
        category: 'armor',
        name: 'armatura a piastre',
        glyph: '[',
        color: 0xb4c5d8,
        description: 'Bonus passivo: +2 armatura finche resta nello zaino.',
        armorBonus: 2,
      };
    case 'serrated-pike':
      return {
        id,
        kind,
        category: 'weapon',
        name: 'picca seghettata',
        glyph: ')',
        color: 0xffd48b,
        description: 'Bonus passivo: +3 danni finche resta nello zaino.',
        attackBonus: 3,
      };
    case 'relic-cleaver':
      return {
        id,
        kind,
        category: 'weapon',
        name: 'mannaia reliquia',
        glyph: ')',
        color: 0xfff0b3,
        description: 'Bonus passivo: +4 danni finche resta nello zaino.',
        attackBonus: 4,
      };
    case 'reinforced-mail':
      return {
        id,
        kind,
        category: 'armor',
        name: 'cotta rinforzata',
        glyph: '[',
        color: 0xc4d2e6,
        description: 'Bonus passivo: +3 armatura finche resta nello zaino.',
        armorBonus: 3,
      };
    case 'bulwark-shell':
      return {
        id,
        kind,
        category: 'armor',
        name: 'guscio bastione',
        glyph: '[',
        color: 0xe0edf8,
        description: 'Bonus passivo: +4 armatura finche resta nello zaino.',
        armorBonus: 4,
      };
    case 'courier-pack':
      return {
        id,
        kind,
        category: 'backpack',
        name: 'zaino da corriere',
        glyph: '}',
        color: 0x9d7c4c,
        description: 'Bonus passivo da run: +1 slot inventario finche resta nello zaino.',
        inventoryBonus: 1,
      };
    case 'scavenger-pack':
      return {
        id,
        kind,
        category: 'backpack',
        name: 'zaino da razziatore',
        glyph: '}',
        color: 0xb08d57,
        description: 'Bonus passivo da run: +2 slot inventario finche resta nello zaino.',
        inventoryBonus: 2,
      };
    case 'expedition-pack':
      return {
        id,
        kind,
        category: 'backpack',
        name: 'zaino da spedizione',
        glyph: '}',
        color: 0xc7a86a,
        description: 'Bonus passivo da run: +3 slot inventario finche resta nello zaino.',
        inventoryBonus: 3,
      };
    case 'hauler-rig':
      return {
        id,
        kind,
        category: 'backpack',
        name: 'rig da trasporto',
        glyph: '}',
        color: 0xe4c27b,
        description: 'Bonus passivo da run: +4 slot inventario finche resta nello zaino.',
        inventoryBonus: 4,
      };
    case 'vault-frame':
      return {
        id,
        kind,
        category: 'backpack',
        name: 'telaio da vault',
        glyph: '}',
        color: 0xf2dc94,
        description: 'Bonus passivo da run: +5 slot inventario finche resta nello zaino.',
        inventoryBonus: 5,
      };
    case 'ember-bomb':
      return {
        id,
        kind,
        category: 'consumable',
        name: 'bomba a brace',
        glyph: '*',
        color: 0xe37a3f,
        description: 'Esplode in mischia e ferisce i mostri adiacenti.',
        damageAmount: 3,
      };
    case 'stim-pack':
      return {
        id,
        kind,
        category: 'consumable',
        name: 'stim-pack',
        glyph: '+',
        color: 0x8de36b,
        description: 'Recuperi 2 HP e guadagni un piccolo margine.',
        healAmount: 2,
      };
    case 'rusted-blade':
      return {
        id,
        kind,
        category: 'weapon',
        name: 'lama arrugginita',
        glyph: ')',
        color: 0xd9c27a,
        description: 'Bonus passivo: +1 danno finche resta nello zaino.',
        attackBonus: 1,
      };
    case 'scrap-armor':
      return {
        id,
        kind,
        category: 'armor',
        name: 'corazza di ferraglia',
        glyph: '[',
        color: 0x8da0b3,
        description: 'Bonus passivo: +1 armatura finche resta nello zaino.',
        armorBonus: 1,
      };
    case 'medkit':
    default:
      return {
        id,
        kind: 'medkit',
        category: 'consumable',
        name: 'kit medico',
        glyph: '!',
        color: 0x7fd6ff,
        description: 'Recuperi 4 HP.',
        healAmount: 4,
      };
  }
};

export const cloneItem = (item: Item): Item => ({ ...item });

export const serializeItem = (item: Item): StoredItem => ({ ...item });

export const hydrateItem = (storedItem: StoredItem): Item => createItem(storedItem.kind, storedItem.id);

export const getInventorySizeBonus = (inventory: Array<Item | null>): number => {
  let bestBackpackBonus = 0;

  for (const item of inventory) {
    if (!item) {
      continue;
    }

    bestBackpackBonus = Math.max(bestBackpackBonus, item.inventoryBonus ?? 0);
  }

  return bestBackpackBonus;
};

type DepthWeightedItem = {
  kind: ItemKind;
  weight: number;
  minDepth?: number;
};

const DEPTH_WEIGHTED_ITEMS: DepthWeightedItem[] = [
  { kind: 'medkit', weight: 24 },
  { kind: 'bandage-roll', weight: 22 },
  { kind: 'stim-pack', weight: 18 },
  { kind: 'ember-bomb', weight: 14 },
  { kind: 'shock-orb', weight: 12, minDepth: 3 },
  { kind: 'rusted-blade', weight: 13 },
  { kind: 'scrap-armor', weight: 13 },
  { kind: 'courier-pack', weight: 10, minDepth: 2 },
  { kind: 'field-medkit', weight: 12, minDepth: 3 },
  { kind: 'inferno-charge', weight: 10, minDepth: 4 },
  { kind: 'steel-blade', weight: 10, minDepth: 4 },
  { kind: 'plate-armor', weight: 10, minDepth: 5 },
  { kind: 'serrated-pike', weight: 9, minDepth: 6 },
  { kind: 'reinforced-mail', weight: 9, minDepth: 6 },
  { kind: 'scavenger-pack', weight: 9, minDepth: 4 },
  { kind: 'expedition-pack', weight: 7, minDepth: 6 },
  { kind: 'relic-cleaver', weight: 6, minDepth: 8 },
  { kind: 'bulwark-shell', weight: 6, minDepth: 8 },
  { kind: 'hauler-rig', weight: 5, minDepth: 8 },
  { kind: 'vault-frame', weight: 3, minDepth: 10 },
];

const getDepthLootPool = (depth: number): DepthWeightedItem[] =>
  DEPTH_WEIGHTED_ITEMS.filter((entry) => depth >= (entry.minDepth ?? 1));

const rollWeightedItemKind = (pool: DepthWeightedItem[]): ItemKind => {
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.kind;
    }
  }

  return pool[pool.length - 1].kind;
};

const getAvailableFloorTiles = (tiles: TileGrid, reserved: Point[]): Point[] => {
  const reservedKeys = new Set(reserved.map((point) => `${point.x},${point.y}`));
  const positions: Point[] = [];

  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < tiles[y].length; x += 1) {
      if (tiles[y][x] !== 'floor') {
        continue;
      }

      const key = `${x},${y}`;
      if (reservedKeys.has(key)) {
        continue;
      }

      positions.push({ x, y });
    }
  }

  return positions;
};

export const spawnGroundItems = (tiles: TileGrid, reserved: Point[], depth = 1): GroundItem[] => {
  const positions = shuffle(getAvailableFloorTiles(tiles, reserved));
  const count = Math.min(
    getDepthLootPool(depth).length + Math.min(depth - 1, 2),
    Math.max(2, Math.floor(positions.length / 28) + Math.floor((depth - 1) / 2)),
  );
  const result: GroundItem[] = [];
  const pool = getDepthLootPool(depth);

  for (let i = 0; i < count; i += 1) {
    result.push({
      item: createItem(rollWeightedItemKind(pool)),
      position: positions[i],
    });
  }

  return result;
};

export const rollMonsterDrop = (depth = 1): Item | null => {
  const dropChance = Math.min(0.82, 0.42 + depth * 0.035);

  if (Math.random() > dropChance) {
    return null;
  }

  return createItem(rollWeightedItemKind(getDepthLootPool(depth)));
};
