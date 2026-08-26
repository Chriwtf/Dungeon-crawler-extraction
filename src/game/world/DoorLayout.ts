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
  for (const connection of connections) {
    const previous = rooms.find((room) => room.id === connection.fromRoomId);
    const room = rooms.find((candidate) => candidate.id === connection.toRoomId);
    if (previous === undefined || room === undefined) continue;
    const doorway = findDoorway(tiles, room, previous.center);
    if (doorway === undefined) continue;

    doors.push({
      id: `door-${connection.id}`,
      point: doorway.point,
      // Keys arrive in Step 16. Until then, only open and closed doors can gate the critical path.
      state: random() < 0.26 ? 'open' : 'closed',
      noise: 4,
      turnCost: 1,
      areas: [previous.id, room.id],
      rotation: doorway.dx !== 0 ? 0 : Math.PI / 2,
      wallOffset: { x: doorway.dx, y: doorway.dy },
    });
  }
  return doors;
}

function findDoorway(tiles: TileGrid, room: RoomData, origin: Point): { point: Point; dx: number; dy: number } | undefined {
  const candidates: Array<{ point: Point; dx: number; dy: number }> = [];
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      if (x !== room.x && x !== room.x + room.w - 1 && y !== room.y && y !== room.y + room.h - 1) continue;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const outsideX = x + dx;
        const outsideY = y + dy;
        const outsideRoom = outsideX >= room.x && outsideX < room.x + room.w && outsideY >= room.y && outsideY < room.y + room.h;
        if (outsideRoom || tiles[outsideY]?.[outsideX] === undefined || tiles[outsideY][outsideX] === 'wall') continue;
        candidates.push({ point: { x, y }, dx, dy });
      }
    }
  }
  return candidates.sort((a, b) => distance(a.point, origin) - distance(b.point, origin))[0];
}

function distance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
