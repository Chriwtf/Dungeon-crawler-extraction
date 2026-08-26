import { createDoorLayout } from './DoorLayout';
import { carveDungeonTopology } from './DungeonTopology';
import { assignRoomArchetypes } from './RoomArchetypes';
export const BASE_TILE_SIZE = 24;
export const BASE_MAP_WIDTH = 32;
export const BASE_MAP_HEIGHT = 20;
const MIN_REQUIRED_ROOMS = 6;
const MAX_GENERATION_ATTEMPTS = 8;
const randomBetween = (random, min, max) => Math.floor(random() * (max - min + 1)) + min;
const createSeededRandom = (seed) => {
    let state = seed >>> 0 || 0x9e3779b9;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
};
const createFilledGrid = (config) => Array.from({ length: config.height }, () => Array.from({ length: config.width }, () => 'wall'));
const carveRoom = (tiles, room) => {
    for (let y = room.y; y < room.y + room.h; y += 1) {
        for (let x = room.x; x < room.x + room.w; x += 1) {
            tiles[y][x] = 'floor';
        }
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
const generateRandomRooms = (config, random) => {
    const tiles = createFilledGrid(config);
    const rooms = [];
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
const generateFallbackRooms = (config, random) => {
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
const buildDungeonLayout = (config, random) => {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
        const layout = generateRandomRooms(config, random);
        if (layout.rooms.length >= MIN_REQUIRED_ROOMS) {
            return layout;
        }
    }
    return generateFallbackRooms(config, random);
};
export const createDungeonConfigForDepth = (depth) => {
    const clampedDepth = Math.max(1, depth);
    return {
        width: Math.min(BASE_MAP_WIDTH + (clampedDepth - 1) * 2, 40),
        height: Math.min(BASE_MAP_HEIGHT + (clampedDepth - 1), 26),
        targetRooms: Math.min(8 + clampedDepth * 2, 14),
        minRoomSize: 4,
        maxRoomSize: Math.min(8 + Math.floor((clampedDepth - 1) / 2), 10),
    };
};
export const generateDungeon = (config, seed) => {
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
    const roomData = rooms.map((room, index) => ({
        ...room,
        id: `room-${index}`,
        archetype: archetypes[index],
    }));
    const connections = carveDungeonTopology(tiles, roomData, random);
    const doors = createDoorLayout(tiles, roomData, connections, random);
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
