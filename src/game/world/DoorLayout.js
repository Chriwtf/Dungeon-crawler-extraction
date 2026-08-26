export function createDoorLayout(tiles, rooms, connections, random) {
    const doors = [];
    const roomsWithDoors = new Set();
    for (const connection of connections) {
        const previous = rooms.find((room) => room.id === connection.fromRoomId);
        const room = rooms.find((candidate) => candidate.id === connection.toRoomId);
        if (previous === undefined || room === undefined || connection.kind === 'shortcut' || roomsWithDoors.has(room.id))
            continue;
        const doorway = connection.doorway;
        if (!hasDoorFrame(tiles, doorway.point, doorway.wallOffset))
            continue;
        doors.push({
            id: `door-${connection.id}`,
            point: doorway.point,
            // Keys arrive in Step 16. Until then, only open and closed doors can gate the critical path.
            state: random() < 0.26 ? 'open' : 'closed',
            noise: 4,
            turnCost: 1,
            areas: [previous.id, room.id],
            rotation: doorway.rotation,
            wallOffset: doorway.wallOffset,
        });
        roomsWithDoors.add(room.id);
    }
    // One key gate creates a short, solvable detour without sealing the procedural objective.
    const lockable = doors.filter((door) => door.state === 'closed');
    const index = lockable.length === 0 ? -1 : Math.floor(random() * lockable.length);
    const locked = lockable[index];
    if (locked === undefined)
        return doors;
    return doors.map((door) => door.id === locked.id
        ? { ...door, state: 'locked', requiredKey: 'AMBER KEYCARD' }
        : door);
}
function hasDoorFrame(tiles, point, offset) {
    const outside = { x: point.x + offset.x, y: point.y + offset.y };
    const lateral = offset.x !== 0
        ? [{ x: outside.x, y: outside.y - 1 }, { x: outside.x, y: outside.y + 1 }]
        : [{ x: outside.x - 1, y: outside.y }, { x: outside.x + 1, y: outside.y }];
    return lateral.every((candidate) => tiles[candidate.y]?.[candidate.x] === 'wall');
}
