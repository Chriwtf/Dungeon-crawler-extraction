export function carveDungeonTopology(tiles, rooms, random) {
    if (rooms.length < 2)
        return [];
    const objectiveIndex = Math.max(1, rooms.length - 2);
    const extractionIndex = rooms.length - 1;
    const mainIndices = unique([0, Math.min(1, objectiveIndex), objectiveIndex, extractionIndex]);
    const connections = [];
    const connected = new Set(mainIndices);
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
function createConnection(rooms, from, to, kind, doorway) {
    return { id: `path-${from}-${to}`, fromRoomId: rooms[from].id, toRoomId: rooms[to].id, kind, doorway };
}
function nearestConnectedRoom(index, connected, rooms) {
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
function connect(tiles, from, to, random) {
    if (random() > 0.5) {
        carveHorizontalTunnel(tiles, from.center.x, to.center.x, from.center.y);
        carveVerticalTunnel(tiles, from.center.y, to.center.y, to.center.x);
        return isWithin(from.center.y, to.y, to.h) ? horizontalDoorway(to, from.center.x) : verticalDoorway(to, from.center.y);
    }
    carveVerticalTunnel(tiles, from.center.y, to.center.y, from.center.x);
    carveHorizontalTunnel(tiles, from.center.x, to.center.x, to.center.y);
    return isWithin(from.center.x, to.x, to.w) ? verticalDoorway(to, from.center.y) : horizontalDoorway(to, from.center.x);
}
function horizontalDoorway(room, fromX) {
    const entersFromWest = fromX <= room.x;
    const x = entersFromWest ? room.x : room.x + room.w - 1;
    const offset = entersFromWest ? -1 : 1;
    return { point: { x, y: room.center.y }, wallOffset: { x: offset, y: 0 }, rotation: 0 };
}
function verticalDoorway(room, fromY) {
    const entersFromNorth = fromY <= room.y;
    const y = entersFromNorth ? room.y : room.y + room.h - 1;
    const offset = entersFromNorth ? -1 : 1;
    return { point: { x: room.center.x, y }, wallOffset: { x: 0, y: offset }, rotation: Math.PI / 2 };
}
function isWithin(value, start, length) {
    return value >= start && value < start + length;
}
function carveHorizontalTunnel(tiles, x1, x2, y) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1)
        tiles[y][x] = 'floor';
}
function carveVerticalTunnel(tiles, y1, y2, x) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1)
        tiles[y][x] = 'floor';
}
function unique(values) {
    return [...new Set(values)];
}
function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
