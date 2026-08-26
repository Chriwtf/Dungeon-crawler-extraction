import type { DungeonData, Point, RoomData } from '../world/DungeonGenerator';

export type ContainerKind = 'keyLocker' | 'medCache';

export type RunContainer = {
  readonly id: string;
  readonly kind: ContainerKind;
  readonly point: Point;
  readonly key?: string;
};

/** Authored utility containers, placed deterministically in rooms the run starts near. */
export function placeRunContainers(dungeon: DungeonData): readonly RunContainer[] {
  const usableRooms = dungeon.rooms.filter((room) => room.id !== dungeon.rooms[dungeon.rooms.length - 2]?.id && room.id !== dungeon.rooms[dungeon.rooms.length - 1]?.id);
  const startRoom = usableRooms[0] ?? dungeon.rooms[0];
  const supplyRoom = usableRooms.find((room) => room.id !== startRoom?.id) ?? startRoom;
  if (startRoom === undefined || supplyRoom === undefined) return [];
  return [
    { id: 'container-amber-key', kind: 'keyLocker', point: containerPoint(startRoom, dungeon.playerStart), key: 'AMBER KEYCARD' },
    { id: 'container-med-cache', kind: 'medCache', point: containerPoint(supplyRoom, supplyRoom.center) },
  ];
}

function containerPoint(room: RoomData, occupied: Point): Point {
  const options = [
    { x: room.center.x + 1, y: room.center.y },
    { x: room.center.x - 1, y: room.center.y },
    { x: room.center.x, y: room.center.y + 1 },
    { x: room.center.x, y: room.center.y - 1 },
  ];
  return options.find((point) => point.x >= room.x && point.x < room.x + room.w && point.y >= room.y && point.y < room.y + room.h && (point.x !== occupied.x || point.y !== occupied.y)) ?? room.center;
}
