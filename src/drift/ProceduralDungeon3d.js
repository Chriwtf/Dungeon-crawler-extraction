export const TILE_METRES = 2;
const WALL_HEIGHT = 3.6;
export function buildDungeonMeshes(dungeon) {
    const floor = new TexturedMeshBuilder();
    const walls = new TexturedMeshBuilder();
    const { tiles } = dungeon;
    for (let y = 0; y < tiles.length; y += 1) {
        for (let x = 0; x < tiles[y].length; x += 1) {
            if (tiles[y][x] === 'wall')
                continue;
            const centre = pointToWorld(dungeon, { x, y });
            const half = TILE_METRES / 2;
            floor.addHorizontalQuad(centre.x - half, centre.z - half, centre.x + half, centre.z + half, 0);
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const neighbour = tiles[y + dy]?.[x + dx];
                if (neighbour !== undefined && neighbour !== 'wall')
                    continue;
                walls.addWall(centre.x, centre.z, dx, dy);
            }
        }
    }
    return { floor: floor.build(), walls: walls.build() };
}
export function pointToWorld(dungeon, point) {
    return {
        x: (point.x - (dungeon.config.width - 1) / 2) * TILE_METRES,
        z: (point.y - (dungeon.config.height - 1) / 2) * TILE_METRES,
    };
}
export function worldToPoint(dungeon, x, z) {
    return {
        x: Math.round(x / TILE_METRES + (dungeon.config.width - 1) / 2),
        y: Math.round(z / TILE_METRES + (dungeon.config.height - 1) / 2),
    };
}
class TexturedMeshBuilder {
    constructor() {
        Object.defineProperty(this, "positions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "normals", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "colors", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "emissive", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "uvs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "indices", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
    }
    addHorizontalQuad(x0, z0, x1, z1, y) {
        this.addQuad([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], 1, 1);
    }
    addWall(x, z, dx, dz) {
        const half = TILE_METRES / 2;
        if (dx !== 0) {
            const wallX = x + dx * half;
            const points = dx > 0
                ? [[wallX, 0, z - half], [wallX, 0, z + half], [wallX, WALL_HEIGHT, z + half], [wallX, WALL_HEIGHT, z - half]]
                : [[wallX, 0, z + half], [wallX, 0, z - half], [wallX, WALL_HEIGHT, z - half], [wallX, WALL_HEIGHT, z + half]];
            this.addQuad(points, [-dx, 0, 0], 1, WALL_HEIGHT / TILE_METRES);
            return;
        }
        const wallZ = z + dz * half;
        const points = dz > 0
            ? [[x + half, 0, wallZ], [x - half, 0, wallZ], [x - half, WALL_HEIGHT, wallZ], [x + half, WALL_HEIGHT, wallZ]]
            : [[x - half, 0, wallZ], [x + half, 0, wallZ], [x + half, WALL_HEIGHT, wallZ], [x - half, WALL_HEIGHT, wallZ]];
        this.addQuad(points, [0, 0, -dz], 1, WALL_HEIGHT / TILE_METRES);
    }
    build() {
        return {
            positions: new Float32Array(this.positions),
            normals: new Float32Array(this.normals),
            colors: new Float32Array(this.colors),
            emissive: new Float32Array(this.emissive),
            uvs: new Float32Array(this.uvs),
            indices: new Uint32Array(this.indices),
        };
    }
    addQuad(points, normal, u, v) {
        const at = this.positions.length / 3;
        for (const point of points) {
            this.positions.push(...point);
            this.normals.push(...normal);
            this.colors.push(1, 1, 1);
            this.emissive.push(0);
        }
        this.uvs.push(0, 0, u, 0, u, v, 0, v);
        this.indices.push(at, at + 1, at + 2, at, at + 2, at + 3);
    }
}
