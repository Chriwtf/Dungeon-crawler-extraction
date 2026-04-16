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
const createItem = (kind) => {
    nextItemId += 1;
    switch (kind) {
        case 'ember-bomb':
            return {
                id: `item-${nextItemId}`,
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
                id: `item-${nextItemId}`,
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
                id: `item-${nextItemId}`,
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
                id: `item-${nextItemId}`,
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
                id: `item-${nextItemId}`,
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
export const spawnGroundItems = (tiles, reserved) => {
    const positions = shuffle(getAvailableFloorTiles(tiles, reserved));
    const itemKinds = [
        'medkit',
        'stim-pack',
        'ember-bomb',
        'rusted-blade',
        'scrap-armor',
    ];
    const count = Math.min(itemKinds.length, Math.max(2, Math.floor(positions.length / 28)));
    const result = [];
    for (let i = 0; i < count; i += 1) {
        result.push({
            item: createItem(itemKinds[i % itemKinds.length]),
            position: positions[i],
        });
    }
    return result;
};
export const rollMonsterDrop = () => {
    const roll = Math.random();
    if (roll < 0.3) {
        return createItem('medkit');
    }
    if (roll < 0.45) {
        return createItem('stim-pack');
    }
    if (roll < 0.58) {
        return createItem('ember-bomb');
    }
    if (roll < 0.73) {
        return createItem('rusted-blade');
    }
    if (roll < 0.86) {
        return createItem('scrap-armor');
    }
    return null;
};
