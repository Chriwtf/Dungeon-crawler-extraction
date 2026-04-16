export const TILE_SIZE = 24;
export const MAP_WIDTH = 32;
export const MAP_HEIGHT = 20;

export type TileType = 'wall' | 'floor' | 'objective' | 'extraction';
export type TileGrid = TileType[][];

export type Point = {
  x: number;
  y: number;
};

export type DungeonData = {
  tiles: TileGrid;
  playerStart: Point;
  objective: Point;
  extraction: Point;
};

type Room = {
  x: number;
  y: number;
  w: number;
  h: number;
  center: Point;
};

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const createFilledGrid = (): TileGrid =>
  Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => 'wall' as TileType),
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

export const generateDungeon = (): DungeonData => {
  const tiles = createFilledGrid();
  const rooms: Room[] = [];
  const maxRooms = 8;

  for (let i = 0; i < maxRooms; i += 1) {
    const w = randomBetween(4, 8);
    const h = randomBetween(4, 7);
    const x = randomBetween(1, MAP_WIDTH - w - 2);
    const y = randomBetween(1, MAP_HEIGHT - h - 2);

    const room: Room = {
      x,
      y,
      w,
      h,
      center: {
        x: Math.floor(x + w / 2),
        y: Math.floor(y + h / 2),
      },
    };

    const overlaps = rooms.some((existing) => intersects(room, existing));
    if (overlaps) {
      continue;
    }

    carveRoom(tiles, room);

    if (rooms.length > 0) {
      const previous = rooms[rooms.length - 1].center;
      if (Math.random() > 0.5) {
        carveHorizontalTunnel(tiles, previous.x, room.center.x, previous.y);
        carveVerticalTunnel(tiles, previous.y, room.center.y, room.center.x);
      } else {
        carveVerticalTunnel(tiles, previous.y, room.center.y, previous.x);
        carveHorizontalTunnel(tiles, previous.x, room.center.x, room.center.y);
      }
    }

    rooms.push(room);
  }

  const playerStart = rooms[0]?.center ?? { x: 2, y: 2 };
  const objective = rooms[Math.max(1, rooms.length - 2)]?.center ?? { x: MAP_WIDTH - 4, y: MAP_HEIGHT - 4 };
  const extraction = rooms[rooms.length - 1]?.center ?? { x: MAP_WIDTH - 2, y: 2 };

  tiles[objective.y][objective.x] = 'objective';
  tiles[extraction.y][extraction.x] = 'extraction';

  return {
    tiles,
    playerStart,
    objective,
    extraction,
  };
};
