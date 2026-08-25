import type { DungeonData, Point } from '../world/DungeonGenerator';

export type LootKind = 'document' | 'sample' | 'component' | 'artifact';

export type LootSpawn = {
  readonly id: string;
  readonly kind: LootKind;
  readonly name: string;
  readonly value: number;
  readonly weight: number;
  readonly point: Point;
};

const LOOT_TABLE = [
  { kind: 'document' as const, name: 'Classified dossier', value: 180, weight: 1 },
  { kind: 'sample' as const, name: 'Biological sample', value: 310, weight: 2 },
  { kind: 'component' as const, name: 'Calibrated component', value: 460, weight: 3 },
  { kind: 'artifact' as const, name: 'Unidentified fragment', value: 720, weight: 4 },
] as const;

export function placeRunLoot(dungeon: DungeonData, seed: number, count = 4): LootSpawn[] {
  const candidates: Point[] = [];
  for (let y = 0; y < dungeon.tiles.length; y += 1) {
    for (let x = 0; x < dungeon.tiles[y].length; x += 1) {
      if (dungeon.tiles[y][x] !== 'floor') continue;
      if (x === dungeon.playerStart.x && y === dungeon.playerStart.y) continue;
      candidates.push({ x, y });
    }
  }

  const random = createSeededRandom(seed ^ 0x51f15e);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [candidates[index], candidates[target]] = [candidates[target], candidates[index]];
  }

  return candidates.slice(0, count).map((point, index) => {
    const entry = LOOT_TABLE[Math.floor(random() * LOOT_TABLE.length)];
    return { id: `loot-${index}`, ...entry, point };
  });
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}
