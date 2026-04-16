const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const createMonster = (kind, position, index, depth) => {
    const bonusHp = Math.max(0, depth - 1);
    const bonusDamage = Math.floor((depth - 1) / 2);
    if (kind === 'sentry') {
        return {
            id: `sentry-${index}`,
            kind,
            name: 'sentinella affamata',
            glyph: 'M',
            position,
            hp: 8 + bonusHp * 2,
            maxHp: 8 + bonusHp * 2,
            damageMin: 2 + bonusDamage,
            damageMax: 4 + bonusDamage,
            color: 0xc75c5c,
            alertRange: 7 + Math.min(depth - 1, 2),
        };
    }
    return {
        id: `rat-${index}`,
        kind,
        name: 'ratto ferale',
        glyph: 'r',
        position,
        hp: 4 + bonusHp,
        maxHp: 4 + bonusHp,
        damageMin: 1 + bonusDamage,
        damageMax: 2 + bonusDamage,
        color: 0xa3aab7,
        alertRange: 5 + Math.min(depth - 1, 2),
    };
};
const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const swapIndex = randomBetween(0, i);
        [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
    }
    return copy;
};
export const rollDamage = (min, max) => randomBetween(min, max);
export const isAdjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
export const getMonsterSpawnPoints = (tiles, reserved) => {
    const reservedKeys = new Set(reserved.map((point) => `${point.x},${point.y}`));
    const floorTiles = [];
    for (let y = 0; y < tiles.length; y += 1) {
        for (let x = 0; x < tiles[y].length; x += 1) {
            if (tiles[y][x] !== 'floor') {
                continue;
            }
            const key = `${x},${y}`;
            if (reservedKeys.has(key)) {
                continue;
            }
            floorTiles.push({ x, y });
        }
    }
    return floorTiles;
};
export const spawnMonsters = (tiles, reserved, depth = 1) => {
    const spawnPoints = shuffle(getMonsterSpawnPoints(tiles, reserved));
    const desiredCount = Math.min(10, Math.max(3, Math.floor(spawnPoints.length / 18) + depth - 1));
    const monsters = [];
    for (let index = 0; index < desiredCount && index < spawnPoints.length; index += 1) {
        const kindThreshold = Math.max(0.35, 0.65 - (depth - 1) * 0.08);
        const kind = Math.random() > kindThreshold ? 'sentry' : 'rat';
        monsters.push(createMonster(kind, spawnPoints[index], index, depth));
    }
    return monsters;
};
export const getStepTowardTarget = (from, to) => {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    const horizontalFirst = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
    if (horizontalFirst) {
        return [
            { x: from.x + dx, y: from.y },
            { x: from.x, y: from.y + dy },
            { x: from.x, y: from.y - dy },
            { x: from.x - dx, y: from.y },
        ];
    }
    return [
        { x: from.x, y: from.y + dy },
        { x: from.x + dx, y: from.y },
        { x: from.x - dx, y: from.y },
        { x: from.x, y: from.y - dy },
    ];
};
export const getRandomNeighborSteps = (from) => shuffle([
    { x: from.x + 1, y: from.y },
    { x: from.x - 1, y: from.y },
    { x: from.x, y: from.y + 1 },
    { x: from.x, y: from.y - 1 },
]);
