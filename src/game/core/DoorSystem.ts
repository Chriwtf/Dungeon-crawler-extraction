import type { DungeonDoor, DoorState } from '../world/DoorLayout';
import type { Point } from '../world/DungeonGenerator';

export type DoorInteraction = {
  readonly door: DungeonDoor;
  readonly opened: boolean;
  readonly message: string;
};

/** Owns mutable door state while the generated layout remains deterministic and immutable. */
export class DoorSystem {
  private readonly doors = new Map<string, DungeonDoor>();

  constructor(layout: readonly DungeonDoor[]) {
    for (const door of layout) this.doors.set(door.id, door);
  }

  getAt(point: Point): DungeonDoor | undefined {
    return [...this.doors.values()].find((door) => door.point.x === point.x && door.point.y === point.y);
  }

  isBlocking(point: Point): boolean {
    const door = this.getAt(point);
    return door !== undefined && door.state !== 'open';
  }

  interact(point: Point): DoorInteraction | undefined {
    const door = this.getAt(point);
    if (door === undefined) return undefined;
    if (door.state === 'open') return { door, opened: false, message: 'THE DOOR IS ALREADY OPEN.' };
    if (door.state === 'locked') return { door, opened: false, message: `LOCKED. REQUIRES ${door.requiredKey ?? 'A KEY'}.` };
    if (door.state === 'sealed') return { door, opened: false, message: 'THE DOOR IS SEALED FROM THE OTHER SIDE.' };
    if (door.state === 'secret') return { door, opened: false, message: 'THE STONE DOES NOT YIELD.' };

    const openedDoor = { ...door, state: 'open' as DoorState };
    this.doors.set(door.id, openedDoor);
    return { door: openedDoor, opened: true, message: 'THE IRON DOOR GROANS OPEN.' };
  }
}
