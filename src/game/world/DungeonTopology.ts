import type { Point, TileGrid } from './DungeonGenerator';

export type DungeonPathKind = 'mainPath' | 'sidePath' | 'rewardDeadEnd' | 'shortcut';

export type DungeonConnection = {
  readonly id: string;
  readonly fromRoomId: string;
  readonly toRoomId: string;
  readonly kind: DungeonPathKind;
};

export type TopologyRoom = {
  readonly id: string;
  readonly center: Point;
};

export function carveDungeonTopology(tiles: TileGrid, rooms: readonly TopologyRoom[], random: () => number): readonly DungeonConnection[] {
  if (rooms.length < 2) return [];

  const objectiveIndex = Math.max(1, rooms.length - 2);
  const extractionIndex = rooms.length - 1;
  const mainIndices = unique([0, Math.min(1, objectiveIndex), objectiveIndex, extractionIndex]);
  const connections: DungeonConnection[] = [];
  const connected = new Set<number>(mainIndices);

  for (let index = 1; index < mainIndices.length; index += 1) {
    connect(tiles, rooms[mainIndices[index - 1]].center, rooms[mainIndices[index]].center, random);
    connections.push(createConnection(rooms, mainIndices[index - 1], mainIndices[index], 'mainPath'));
  }

  const sideIndices = rooms.map((_, index) => index).filter((index) => !connected.has(index));
  const rewardIndex = [...sideIndices].sort((a, b) => manhattan(rooms[b].center, rooms[0].center) - manhattan(rooms[a].center, rooms[0].center))[0];
  for (const index of sideIndices) {
    const parent = nearestConnectedRoom(index, connected, rooms);
    connect(tiles, rooms[parent].center, rooms[index].center, random);
    connections.push(createConnection(rooms, parent, index, index === rewardIndex ? 'rewardDeadEnd' : 'sidePath'));
    connected.add(index);
  }

  if (mainIndices.length >= 3) {
    const from = mainIndices[0];
    const to = mainIndices[mainIndices.length - 2];
    connect(tiles, rooms[from].center, rooms[to].center, random);
    connections.push(createConnection(rooms, from, to, 'shortcut'));
  }

  return connections;
}

function createConnection(rooms: readonly TopologyRoom[], from: number, to: number, kind: DungeonPathKind): DungeonConnection {
  return { id: `path-${from}-${to}`, fromRoomId: rooms[from].id, toRoomId: rooms[to].id, kind };
}

function nearestConnectedRoom(index: number, connected: ReadonlySet<number>, rooms: readonly TopologyRoom[]): number {
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of connected) {
    const distance = manhattan(rooms[index].center, rooms[candidate].center);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function connect(tiles: TileGrid, from: Point, to: Point, random: () => number): void {
  if (random() > 0.5) {
    carveHorizontalTunnel(tiles, from.x, to.x, from.y);
    carveVerticalTunnel(tiles, from.y, to.y, to.x);
    return;
  }
  carveVerticalTunnel(tiles, from.y, to.y, from.x);
  carveHorizontalTunnel(tiles, from.x, to.x, to.y);
}

function carveHorizontalTunnel(tiles: TileGrid, x1: number, x2: number, y: number): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) tiles[y][x] = 'floor';
}

function carveVerticalTunnel(tiles: TileGrid, y1: number, y2: number, x: number): void {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) tiles[y][x] = 'floor';
}

function unique(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
