import type { Point, TileGrid } from '../world/DungeonGenerator';

export type MonsterKind = 'rat' | 'sentry';

export type Monster = {
  id: string;
  kind: MonsterKind;
  name: string;
  position: Point;
  hp: number;
  maxHp: number;
  damageMin: number;
  damageMax: number;
  color: number;
  alertRange: number;
};

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const createMonster = (kind: MonsterKind, position: Point, index: number, depth: number): Monster => {
  const bonusHp = Math.max(0, depth - 1);
  const bonusDamage = Math.floor((depth - 1) / 2);

  if (kind === 'sentry') {
    return {
      id: `sentry-${index}`,
      kind,
      name: 'sentinella affamata',
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
    position,
    hp: 4 + bonusHp,
    maxHp: 4 + bonusHp,
    damageMin: 1 + bonusDamage,
    damageMax: 2 + bonusDamage,
    color: 0xa3aab7,
    alertRange: 5 + Math.min(depth - 1, 2),
  };
};

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const swapIndex = randomBetween(0, i);
    [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
  }

  return copy;
};

export const rollDamage = (min: number, max: number): number => randomBetween(min, max);

export const isAdjacent = (a: Point, b: Point): boolean =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

export const getMonsterSpawnPoints = (tiles: TileGrid, reserved: Point[]): Point[] => {
  const reservedKeys = new Set(reserved.map((point) => `${point.x},${point.y}`));
  const floorTiles: Point[] = [];

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

export const spawnMonsters = (tiles: TileGrid, reserved: Point[], depth = 1): Monster[] => {
  const spawnPoints = shuffle(getMonsterSpawnPoints(tiles, reserved));
  const desiredCount = Math.min(10, Math.max(3, Math.floor(spawnPoints.length / 18) + depth - 1));
  const monsters: Monster[] = [];

  for (let index = 0; index < desiredCount && index < spawnPoints.length; index += 1) {
    const kindThreshold = Math.max(0.35, 0.65 - (depth - 1) * 0.08);
    const kind: MonsterKind = Math.random() > kindThreshold ? 'sentry' : 'rat';
    monsters.push(createMonster(kind, spawnPoints[index], index, depth));
  }

  return monsters;
};

export const getStepTowardTarget = (from: Point, to: Point): Point[] => {
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

export const getRandomNeighborSteps = (from: Point): Point[] =>
  shuffle([
    { x: from.x + 1, y: from.y },
    { x: from.x - 1, y: from.y },
    { x: from.x, y: from.y + 1 },
    { x: from.x, y: from.y - 1 },
  ]);
