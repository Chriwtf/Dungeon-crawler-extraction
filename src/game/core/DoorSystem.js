/** Owns mutable door state while the generated layout remains deterministic and immutable. */
export class DoorSystem {
    constructor(layout) {
        Object.defineProperty(this, "doors", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        for (const door of layout)
            this.doors.set(door.id, door);
    }
    getAt(point) {
        return [...this.doors.values()].find((door) => door.point.x === point.x && door.point.y === point.y);
    }
    isBlocking(point) {
        const door = this.getAt(point);
        return door !== undefined && door.state !== 'open';
    }
    interact(point) {
        const door = this.getAt(point);
        if (door === undefined)
            return undefined;
        if (door.state === 'open')
            return { door, opened: false, message: 'THE DOOR IS ALREADY OPEN.' };
        if (door.state === 'locked')
            return { door, opened: false, message: `LOCKED. REQUIRES ${door.requiredKey ?? 'A KEY'}.` };
        if (door.state === 'sealed')
            return { door, opened: false, message: 'THE DOOR IS SEALED FROM THE OTHER SIDE.' };
        if (door.state === 'secret')
            return { door, opened: false, message: 'THE STONE DOES NOT YIELD.' };
        const openedDoor = { ...door, state: 'open' };
        this.doors.set(door.id, openedDoor);
        return { door: openedDoor, opened: true, message: 'THE IRON DOOR GROANS OPEN.' };
    }
}
