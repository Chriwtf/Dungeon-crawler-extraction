export const BASE_INVENTORY_SIZE = 4;
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const swapIndex = randomBetween(0, i);
        [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
    }
    return copy;
};
let nextItemId = 0;
const buildItemId = () => {
    nextItemId += 1;
    return `item-${nextItemId}`;
};
export const createItem = (kind, id = buildItemId()) => {
    switch (kind) {
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
        case 'scavenger-pack':
            return {
                id,
                kind,
                category: 'backpack',
                name: 'zaino da razziatore',
                glyph: '}',
                color: 0xb08d57,
                description: 'Bonus passivo da run: +1 slot inventario finche resta nello zaino.',
                inventoryBonus: 1,
            };
        case 'expedition-pack':
            return {
                id,
                kind,
                category: 'backpack',
                name: 'zaino da spedizione',
                glyph: '}',
                color: 0xc7a86a,
                description: 'Bonus passivo da run: +2 slot inventario finche resta nello zaino.',
                inventoryBonus: 2,
            };
        case 'hauler-rig':
            return {
                id,
                kind,
                category: 'backpack',
                name: 'rig da trasporto',
                glyph: '}',
                color: 0xe4c27b,
                description: 'Bonus passivo da run: +3 slot inventario finche resta nello zaino.',
                inventoryBonus: 3,
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
export const cloneItem = (item) => ({ ...item });
export const serializeItem = (item) => ({ ...item });
export const hydrateItem = (storedItem) => createItem(storedItem.kind, storedItem.id);
export const getInventorySizeBonus = (inventory) => {
    let bestBackpackBonus = 0;
    for (const item of inventory) {
        if (!item) {
            continue;
        }
        bestBackpackBonus = Math.max(bestBackpackBonus, item.inventoryBonus ?? 0);
    }
    return bestBackpackBonus;
};
const DEPTH_WEIGHTED_ITEMS = [
    { kind: 'medkit', weight: 24 },
    { kind: 'stim-pack', weight: 18 },
    { kind: 'ember-bomb', weight: 14 },
    { kind: 'rusted-blade', weight: 13 },
    { kind: 'scrap-armor', weight: 13 },
    { kind: 'field-medkit', weight: 12, minDepth: 3 },
    { kind: 'inferno-charge', weight: 10, minDepth: 4 },
    { kind: 'steel-blade', weight: 10, minDepth: 4 },
    { kind: 'plate-armor', weight: 10, minDepth: 5 },
    { kind: 'scavenger-pack', weight: 9, minDepth: 2 },
    { kind: 'expedition-pack', weight: 7, minDepth: 5 },
    { kind: 'hauler-rig', weight: 4, minDepth: 8 },
];
const getDepthLootPool = (depth) => DEPTH_WEIGHTED_ITEMS.filter((entry) => depth >= (entry.minDepth ?? 1));
const rollWeightedItemKind = (pool) => {
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
const getAvailableFloorTiles = (tiles, reserved) => {
    const reservedKeys = new Set(reserved.map((point) => `${point.x},${point.y}`));
    const positions = [];
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
export const spawnGroundItems = (tiles, reserved, depth = 1) => {
    const positions = shuffle(getAvailableFloorTiles(tiles, reserved));
    const count = Math.min(getDepthLootPool(depth).length + Math.min(depth - 1, 2), Math.max(2, Math.floor(positions.length / 28) + Math.floor((depth - 1) / 2)));
    const result = [];
    const pool = getDepthLootPool(depth);
    for (let i = 0; i < count; i += 1) {
        result.push({
            item: createItem(rollWeightedItemKind(pool)),
            position: positions[i],
        });
    }
    return result;
};
export const rollMonsterDrop = (depth = 1) => {
    const dropChance = Math.min(0.82, 0.42 + depth * 0.035);
    if (Math.random() > dropChance) {
        return null;
    }
    return createItem(rollWeightedItemKind(getDepthLootPool(depth)));
};
