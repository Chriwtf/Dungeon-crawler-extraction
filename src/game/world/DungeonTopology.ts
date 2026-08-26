import type { Point, TileGrid } from './DungeonGenerator';

export type DungeonPathKind = 'mainPath' | 'sidePath' | 'rewardDeadEnd' | 'shortcut';

export type DungeonConnection = {
  readonly id: string;
  readonly fromRoomId: string;
  readonly toRoomId: string;
  readonly kind: DungeonPathKind;
  readonly doorway: DoorwayPlacement;
};

export type TopologyRoom = {
  readonly id: string;
  readonly center: Point;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type DoorwayPlacement = {
  readonly point: Point;
  readonly wallOffset: Readonly<{ x: number; y: number }>;
  readonly rotation: number;
};

export function carveDungeonTopology(tiles: TileGrid, rooms: readonly TopologyRoom[], random: () => number): readonly DungeonConnection[] {
  if (rooms.length < 2) return [];

  const objectiveIndex = Math.max(1, rooms.length - 2);
  const extractionIndex = rooms.length - 1;
  const mainIndices = unique([0, Math.min(1, objectiveIndex), objectiveIndex, extractionIndex]);
  const connections: DungeonConnection[] = [];
  const connected = new Set<number>(mainIndices);

  for (let index = 1; index < mainIndices.length; index += 1) {
    const from = mainIndices[index - 1];
    const to = mainIndices[index];
    connections.push(createConnection(rooms, from, to, 'mainPath', connect(tiles, rooms[from], rooms[to], random)));
  }

  const sideIndices = rooms.map((_, index) => index).filter((index) => !connected.has(index));
  const rewardIndex = [...sideIndices].sort((a, b) => manhattan(rooms[b].center, rooms[0].center) - manhattan(rooms[a].center, rooms[0].center))[0];
  for (const index of sideIndices) {
    const parent = nearestConnectedRoom(index, connected, rooms);
    connections.push(createConnection(rooms, parent, index, index === rewardIndex ? 'rewardDeadEnd' : 'sidePath', connect(tiles, rooms[parent], rooms[index], random)));
    connected.add(index);
  }

  if (mainIndices.length >= 3) {
    const from = mainIndices[0];
    const to = mainIndices[mainIndices.length - 2];
    connections.push(createConnection(rooms, from, to, 'shortcut', connect(tiles, rooms[from], rooms[to], random)));
  }

  return connections;
}

function createConnection(rooms: readonly TopologyRoom[], from: number, to: number, kind: DungeonPathKind, doorway: DoorwayPlacement): DungeonConnection {
  return { id: `path-${from}-${to}`, fromRoomId: rooms[from].id, toRoomId: rooms[to].id, kind, doorway };
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

function connect(tiles: TileGrid, from: TopologyRoom, to: TopologyRoom, random: () => number): DoorwayPlacement {
  if (random() > 0.5) {
    carveHorizontalTunnel(tiles, from.center.x, to.center.x, from.center.y);
    carveVerticalTunnel(tiles, from.center.y, to.center.y, to.center.x);
    return isWithin(from.center.y, to.y, to.h) ? horizontalDoorway(to, from.center.x) : verticalDoorway(to, from.center.y);
  }
  carveVerticalTunnel(tiles, from.center.y, to.center.y, from.center.x);
  carveHorizontalTunnel(tiles, from.center.x, to.center.x, to.center.y);
  return isWithin(from.center.x, to.x, to.w) ? verticalDoorway(to, from.center.y) : horizontalDoorway(to, from.center.x);
}

function horizontalDoorway(room: TopologyRoom, fromX: number): DoorwayPlacement {
  const entersFromWest = fromX <= room.x;
  const x = entersFromWest ? room.x : room.x + room.w - 1;
  const offset = entersFromWest ? -1 : 1;
  return { point: { x, y: room.center.y }, wallOffset: { x: offset, y: 0 }, rotation: 0 };
}

function verticalDoorway(room: TopologyRoom, fromY: number): DoorwayPlacement {
  const entersFromNorth = fromY <= room.y;
  const y = entersFromNorth ? room.y : room.y + room.h - 1;
  const offset = entersFromNorth ? -1 : 1;
  return { point: { x: room.center.x, y }, wallOffset: { x: 0, y: offset }, rotation: Math.PI / 2 };
}

function isWithin(value: number, start: number, length: number): boolean {
  return value >= start && value < start + length;
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
