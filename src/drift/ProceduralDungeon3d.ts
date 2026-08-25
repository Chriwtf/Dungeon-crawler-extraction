import type { MeshData } from '@driftengine/core';
import type { DungeonData, Point } from '../game/world/DungeonGenerator';

export const TILE_METRES = 2;
const WALL_HEIGHT = 3.6;

export type DungeonMeshes = {
  readonly floor: MeshData;
  readonly walls: MeshData;
};

export function buildDungeonMeshes(dungeon: DungeonData): DungeonMeshes {
  const floor = new TexturedMeshBuilder();
  const walls = new TexturedMeshBuilder();
  const { tiles } = dungeon;

  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < tiles[y].length; x += 1) {
      if (tiles[y][x] === 'wall') continue;
      const centre = pointToWorld(dungeon, { x, y });
      const half = TILE_METRES / 2;
      floor.addHorizontalQuad(centre.x - half, centre.z - half, centre.x + half, centre.z + half, 0);

      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const neighbour = tiles[y + dy]?.[x + dx];
        if (neighbour !== undefined && neighbour !== 'wall') continue;
        walls.addWall(centre.x, centre.z, dx, dy);
      }
    }
  }

  return { floor: floor.build(), walls: walls.build() };
}

export function pointToWorld(dungeon: DungeonData, point: Point): { x: number; z: number } {
  return {
    x: (point.x - (dungeon.config.width - 1) / 2) * TILE_METRES,
    z: (point.y - (dungeon.config.height - 1) / 2) * TILE_METRES,
  };
}

export function worldToPoint(dungeon: DungeonData, x: number, z: number): Point {
  return {
    x: Math.round(x / TILE_METRES + (dungeon.config.width - 1) / 2),
    y: Math.round(z / TILE_METRES + (dungeon.config.height - 1) / 2),
  };
}

class TexturedMeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly emissive: number[] = [];
  private readonly uvs: number[] = [];
  private readonly indices: number[] = [];

  addHorizontalQuad(x0: number, z0: number, x1: number, z1: number, y: number): void {
    this.addQuad([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], 1, 1);
  }

  addWall(x: number, z: number, dx: number, dz: number): void {
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

  build(): MeshData {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      emissive: new Float32Array(this.emissive),
      uvs: new Float32Array(this.uvs),
      indices: new Uint32Array(this.indices),
    };
  }

  private addQuad(points: readonly number[][], normal: readonly number[], u: number, v: number): void {
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
