import type { DungeonConnection } from './DungeonTopology';
import type { Point, RoomData, TileGrid } from './DungeonGenerator';

export type DoorState = 'open' | 'closed' | 'locked' | 'sealed' | 'secret';

export type DungeonDoor = {
  readonly id: string;
  readonly point: Point;
  readonly state: DoorState;
  readonly requiredKey?: string;
  readonly noise: number;
  readonly turnCost: number;
  readonly areas: readonly [string, string];
  readonly rotation: number;
  readonly wallOffset: Readonly<{ x: number; y: number }>;
};

export function createDoorLayout(tiles: TileGrid, rooms: readonly RoomData[], connections: readonly DungeonConnection[], random: () => number): readonly DungeonDoor[] {
  const doors: DungeonDoor[] = [];
  const roomsWithDoors = new Set<string>();
  for (const connection of connections) {
    const previous = rooms.find((room) => room.id === connection.fromRoomId);
    const room = rooms.find((candidate) => candidate.id === connection.toRoomId);
    if (previous === undefined || room === undefined || connection.kind === 'shortcut' || roomsWithDoors.has(room.id)) continue;
    const doorway = connection.doorway;
    if (!hasDoorFrame(tiles, doorway.point, doorway.wallOffset)) continue;

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
  return doors;
}

function hasDoorFrame(tiles: TileGrid, point: Point, offset: Readonly<{ x: number; y: number }>): boolean {
  const outside = { x: point.x + offset.x, y: point.y + offset.y };
  const lateral = offset.x !== 0
    ? [{ x: outside.x, y: outside.y - 1 }, { x: outside.x, y: outside.y + 1 }]
    : [{ x: outside.x - 1, y: outside.y }, { x: outside.x + 1, y: outside.y }];
  return lateral.every((candidate) => tiles[candidate.y]?.[candidate.x] === 'wall');
}
