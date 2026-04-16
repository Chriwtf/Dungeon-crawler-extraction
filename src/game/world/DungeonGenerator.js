export const TILE_SIZE = 24;
export const MAP_WIDTH = 32;
export const MAP_HEIGHT = 20;
const TARGET_ROOMS = 8;
const MIN_REQUIRED_ROOMS = 3;
const MAX_GENERATION_ATTEMPTS = 6;
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const createFilledGrid = () => Array.from({ length: MAP_HEIGHT }, () => Array.from({ length: MAP_WIDTH }, () => 'wall'));
const carveRoom = (tiles, room) => {
    for (let y = room.y; y < room.y + room.h; y += 1) {
        for (let x = room.x; x < room.x + room.w; x += 1) {
            tiles[y][x] = 'floor';
        }
    }
};
const carveHorizontalTunnel = (tiles, x1, x2, y) => {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);
    for (let x = start; x <= end; x += 1) {
        tiles[y][x] = 'floor';
    }
};
const carveVerticalTunnel = (tiles, y1, y2, x) => {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);
    for (let y = start; y <= end; y += 1) {
        tiles[y][x] = 'floor';
    }
};
const intersects = (a, b) => a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
const createRoom = (x, y, w, h) => ({
    x,
    y,
    w,
    h,
    center: {
        x: Math.floor(x + w / 2),
        y: Math.floor(y + h / 2),
    },
});
const connectRooms = (tiles, from, to) => {
    if (Math.random() > 0.5) {
        carveHorizontalTunnel(tiles, from.x, to.x, from.y);
        carveVerticalTunnel(tiles, from.y, to.y, to.x);
        return;
    }
    carveVerticalTunnel(tiles, from.y, to.y, from.x);
    carveHorizontalTunnel(tiles, from.x, to.x, to.y);
};
const generateRandomRooms = () => {
    const tiles = createFilledGrid();
    const rooms = [];
    for (let i = 0; i < TARGET_ROOMS; i += 1) {
        const w = randomBetween(4, 8);
        const h = randomBetween(4, 7);
        const x = randomBetween(1, MAP_WIDTH - w - 2);
        const y = randomBetween(1, MAP_HEIGHT - h - 2);
        const room = createRoom(x, y, w, h);
        const overlaps = rooms.some((existing) => intersects(room, existing));
        if (overlaps) {
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
const generateFallbackRooms = () => {
    const tiles = createFilledGrid();
    const rooms = [
        createRoom(2, 6, 6, 6),
        createRoom(12, 4, 7, 7),
        createRoom(23, 8, 6, 6),
    ];
    for (const room of rooms) {
        carveRoom(tiles, room);
    }
    connectRooms(tiles, rooms[0].center, rooms[1].center);
    connectRooms(tiles, rooms[1].center, rooms[2].center);
    return { tiles, rooms };
};
const buildDungeonLayout = () => {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
        const layout = generateRandomRooms();
        if (layout.rooms.length >= MIN_REQUIRED_ROOMS) {
            return layout;
        }
    }
    return generateFallbackRooms();
};
export const generateDungeon = () => {
    const { tiles, rooms } = buildDungeonLayout();
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
    };
};
