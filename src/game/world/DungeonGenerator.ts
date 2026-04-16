export const BASE_TILE_SIZE = 24;
export const BASE_MAP_WIDTH = 32;
export const BASE_MAP_HEIGHT = 20;

export type TileType = 'wall' | 'floor' | 'objective' | 'extraction';
export type TileGrid = TileType[][];

export type Point = {
  x: number;
  y: number;
};

export type DungeonConfig = {
  width: number;
  height: number;
  targetRooms: number;
  minRoomSize: number;
  maxRoomSize: number;
};

export type DungeonData = {
  tiles: TileGrid;
  playerStart: Point;
  objective: Point;
  extraction: Point;
  config: DungeonConfig;
};

type Room = {
  x: number;
  y: number;
  w: number;
  h: number;
  center: Point;
};

const MIN_REQUIRED_ROOMS = 3;
const MAX_GENERATION_ATTEMPTS = 8;

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const createFilledGrid = (config: DungeonConfig): TileGrid =>
  Array.from({ length: config.height }, () =>
    Array.from({ length: config.width }, () => 'wall' as TileType),
  );

const carveRoom = (tiles: TileGrid, room: Room): void => {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      tiles[y][x] = 'floor';
    }
  }
};

const carveHorizontalTunnel = (tiles: TileGrid, x1: number, x2: number, y: number): void => {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);

  for (let x = start; x <= end; x += 1) {
    tiles[y][x] = 'floor';
  }
};

const carveVerticalTunnel = (tiles: TileGrid, y1: number, y2: number, x: number): void => {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);

  for (let y = start; y <= end; y += 1) {
    tiles[y][x] = 'floor';
  }
};

const intersects = (a: Room, b: Room): boolean =>
  a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;

const createRoom = (x: number, y: number, w: number, h: number): Room => ({
  x,
  y,
  w,
  h,
  center: {
    x: Math.floor(x + w / 2),
    y: Math.floor(y + h / 2),
  },
});

const connectRooms = (tiles: TileGrid, from: Point, to: Point): void => {
  if (Math.random() > 0.5) {
    carveHorizontalTunnel(tiles, from.x, to.x, from.y);
    carveVerticalTunnel(tiles, from.y, to.y, to.x);
    return;
  }

  carveVerticalTunnel(tiles, from.y, to.y, from.x);
  carveHorizontalTunnel(tiles, from.x, to.x, to.y);
};

const generateRandomRooms = (config: DungeonConfig): { tiles: TileGrid; rooms: Room[] } => {
  const tiles = createFilledGrid(config);
  const rooms: Room[] = [];

  for (let i = 0; i < config.targetRooms; i += 1) {
    const w = randomBetween(config.minRoomSize, config.maxRoomSize);
    const h = randomBetween(config.minRoomSize, config.maxRoomSize);

    if (config.width - w - 2 <= 1 || config.height - h - 2 <= 1) {
      continue;
    }

    const x = randomBetween(1, config.width - w - 2);
    const y = randomBetween(1, config.height - h - 2);
    const room = createRoom(x, y, w, h);

    if (rooms.some((existing) => intersects(room, existing))) {
      continue;
    }

    carveRoom(tiles, room);

    if (rooms.length > 0) {
      connectRooms(tiles, rooms[rooms.length - 1].center, room.center);
    }

    rooms.push(room);
  }

  return { tiles, rooms };
};

const generateFallbackRooms = (config: DungeonConfig): { tiles: TileGrid; rooms: Room[] } => {
  const tiles = createFilledGrid(config);
  const roomWidth = Math.max(config.minRoomSize + 1, Math.floor(config.width / 6));
  const roomHeight = Math.max(config.minRoomSize + 1, Math.floor(config.height / 3));
  const rooms = [
    createRoom(2, Math.max(2, Math.floor(config.height / 3)), roomWidth, roomHeight),
    createRoom(Math.max(6, Math.floor(config.width / 3)), 2, roomWidth + 1, roomHeight + 1),
    createRoom(Math.max(10, config.width - roomWidth - 3), Math.max(4, Math.floor(config.height / 2)), roomWidth, roomHeight),
  ];

  for (const room of rooms) {
    carveRoom(tiles, room);
  }

  connectRooms(tiles, rooms[0].center, rooms[1].center);
  connectRooms(tiles, rooms[1].center, rooms[2].center);

  return { tiles, rooms };
};

const buildDungeonLayout = (config: DungeonConfig): { tiles: TileGrid; rooms: Room[] } => {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const layout = generateRandomRooms(config);
    if (layout.rooms.length >= MIN_REQUIRED_ROOMS) {
      return layout;
    }
  }

  return generateFallbackRooms(config);
};

export const createDungeonConfigForDepth = (depth: number): DungeonConfig => {
  const clampedDepth = Math.max(1, depth);

  return {
    width: Math.min(BASE_MAP_WIDTH + (clampedDepth - 1) * 2, 40),
    height: Math.min(BASE_MAP_HEIGHT + (clampedDepth - 1), 26),
    targetRooms: Math.min(8 + clampedDepth * 2, 14),
    minRoomSize: 4,
    maxRoomSize: Math.min(8 + Math.floor((clampedDepth - 1) / 2), 10),
  };
};

export const generateDungeon = (config: DungeonConfig): DungeonData => {
  const { tiles, rooms } = buildDungeonLayout(config);
  const playerStart = rooms[0].center;
  const objective = rooms[rooms.length - 2].center;
  const extraction = rooms[rooms.length - 1].center;

  tiles[objective.y][objective.x] = 'objective';
  tiles[extraction.y][extraction.x] = 'extraction';

  return {
    tiles,
    playerStart,
    objective,
    extraction,
    config,
  };
};
