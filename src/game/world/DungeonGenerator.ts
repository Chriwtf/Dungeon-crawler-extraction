import { createDoorLayout, type DungeonDoor } from './DoorLayout';
import { carveDungeonTopology, type DungeonConnection } from './DungeonTopology';
import { assignRoomArchetypes, type RoomArchetypeId } from './RoomArchetypes';

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
  rooms: readonly RoomData[];
  doors: readonly DungeonDoor[];
  connections: readonly DungeonConnection[];
  playerStart: Point;
  objective: Point;
  extraction: Point;
  config: DungeonConfig;
};

export type RoomData = {
  readonly id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  center: Point;
  archetype: RoomArchetypeId;
};

type Room = Omit<RoomData, 'id' | 'archetype'>;

const MIN_REQUIRED_ROOMS = 6;
const MAX_GENERATION_ATTEMPTS = 8;

type RandomSource = () => number;

const randomBetween = (random: RandomSource, min: number, max: number): number =>
  Math.floor(random() * (max - min + 1)) + min;

const createSeededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};

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

const generateRandomRooms = (config: DungeonConfig, random: RandomSource): { tiles: TileGrid; rooms: Room[] } => {
  const tiles = createFilledGrid(config);
  const rooms: Room[] = [];

  const placementAttempts = config.targetRooms * 24;
  for (let attempt = 0; attempt < placementAttempts && rooms.length < config.targetRooms; attempt += 1) {
    const w = randomBetween(random, config.minRoomSize, config.maxRoomSize);
    const h = randomBetween(random, config.minRoomSize, config.maxRoomSize);

    if (config.width - w - 2 <= 1 || config.height - h - 2 <= 1) {
      continue;
    }

    const x = randomBetween(random, 1, config.width - w - 2);
    const y = randomBetween(random, 1, config.height - h - 2);
    const room = createRoom(x, y, w, h);

    if (rooms.some((existing) => intersects(room, existing))) {
      continue;
    }

    carveRoom(tiles, room);

    rooms.push(room);
  }

  return { tiles, rooms };
};

const generateFallbackRooms = (config: DungeonConfig, random: RandomSource): { tiles: TileGrid; rooms: Room[] } => {
  const tiles = createFilledGrid(config);
  const roomWidth = Math.max(config.minRoomSize + 1, Math.floor(config.width / 6));
  const roomHeight = Math.max(config.minRoomSize + 1, Math.floor(config.height / 3));
  const left = 2;
  const middle = Math.max(left + roomWidth + 1, Math.floor((config.width - roomWidth) / 2));
  const right = Math.max(middle + roomWidth + 1, config.width - roomWidth - 2);
  const top = 2;
  const bottom = Math.max(top + roomHeight + 1, config.height - roomHeight - 2);
  const rooms = [
    createRoom(left, top, roomWidth, roomHeight),
    createRoom(middle, top, roomWidth, roomHeight),
    createRoom(right, top, roomWidth, roomHeight),
    createRoom(left, bottom, roomWidth, roomHeight),
    createRoom(middle, bottom, roomWidth, roomHeight),
    createRoom(right, bottom, roomWidth, roomHeight),
  ];

  for (const room of rooms) {
    carveRoom(tiles, room);
  }

  return { tiles, rooms };
};

const buildDungeonLayout = (config: DungeonConfig, random: RandomSource): { tiles: TileGrid; rooms: Room[] } => {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const layout = generateRandomRooms(config, random);
    if (layout.rooms.length >= MIN_REQUIRED_ROOMS) {
      return layout;
    }
  }

  return generateFallbackRooms(config, random);
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

export const generateDungeon = (config: DungeonConfig, seed?: number): DungeonData => {
  const random = seed === undefined ? Math.random : createSeededRandom(seed);
  const { tiles, rooms } = buildDungeonLayout(config, random);
  const playerStart = rooms[0].center;
  const objective = rooms[rooms.length - 2].center;
  const extraction = rooms[rooms.length - 1].center;
  const archetypes = assignRoomArchetypes(rooms.map((room, index) => ({
    index,
    width: room.w,
    height: room.h,
    forcedId: index === rooms.length - 2 ? 'reliquary' : index === rooms.length - 1 ? 'extractionRoom' : undefined,
  })), random);
  const roomData: readonly RoomData[] = rooms.map((room, index) => ({
    ...room,
    id: `room-${index}`,
    archetype: archetypes[index],
  }));
  const connections = carveDungeonTopology(tiles, roomData, random);
  const doors = createDoorLayout(roomData, connections, random);

  tiles[objective.y][objective.x] = 'objective';
  tiles[extraction.y][extraction.x] = 'extraction';

  return {
    tiles,
    rooms: roomData,
    doors,
    connections,
    playerStart,
    objective,
    extraction,
    config,
  };
};
