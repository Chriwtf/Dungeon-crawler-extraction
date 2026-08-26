import type { MeshData } from '@driftengine/core';
import type { EnemyKind } from '../game/core/EnemyDirector';

type UvRect = readonly [number, number, number, number];
type Color = readonly [number, number, number];
type Palette = { readonly torso: Color; readonly head: Color; readonly arm: Color; readonly leg: Color };

const GUARD: Record<string, UvRect> = {
  torso: [0.03, 0.08, 0.38, 0.43], head: [0.38, 0.02, 0.58, 0.18],
  arm: [0.57, 0.06, 0.77, 0.35], leg: [0.04, 0.58, 0.38, 0.98],
};
const CRAWLER: Record<string, UvRect> = {
  torso: [0.2, 0.02, 0.7, 0.48], head: [0.0, 0.03, 0.2, 0.28],
  arm: [0.0, 0.34, 0.25, 0.76], leg: [0.55, 0.48, 0.96, 0.97],
};

/** Hand-authored low-poly humanoids, with each body part mapped to its atlas region. */
export function buildEnemyMeshes(): Record<EnemyKind, MeshData> {
  const guard = new CharacterMeshBuilder();
  addHumanoid(guard, GUARD, { torso: [0.15, 0.19, 0.2], head: [0.09, 0.12, 0.13], arm: [0.19, 0.24, 0.2], leg: [0.16, 0.2, 0.17] }, { height: 1.72, shoulder: 0.35, torso: 0.27, limb: 0.095, stance: 0.17 });
  guard.addBox([0, 1.58, 0.17], [0.18, 0.07, 0.035], [0.42, 0.5, 0.44], GUARD.torso);

  const crawler = new CharacterMeshBuilder();
  addHumanoid(crawler, CRAWLER, { torso: [0.28, 0.42, 0.32], head: [0.36, 0.5, 0.38], arm: [0.33, 0.46, 0.34], leg: [0.19, 0.25, 0.18] }, { height: 1.28, shoulder: 0.31, torso: 0.25, limb: 0.1, stance: 0.21, crouch: 0.22 });
  crawler.addBox([0, 1.03, 0.19], [0.23, 0.12, 0.08], [0.16, 0.2, 0.14], CRAWLER.torso);
  return { guard: guard.build(), crawler: crawler.build() };
}

/** The Apex is a tall, asymmetrical humanoid silhouette rather than a proxy cylinder. */
export function buildApexMesh(): MeshData {
  const apex = new CharacterMeshBuilder();
  const material: UvRect = [0.06, 0.08, 0.94, 0.92];
  addHumanoid(apex, { torso: material, head: material, arm: material, leg: material }, { torso: [0.035, 0.055, 0.065], head: [0.02, 0.035, 0.04], arm: [0.05, 0.07, 0.08], leg: [0.04, 0.06, 0.07] }, { height: 2.02, shoulder: 0.28, torso: 0.2, limb: 0.07, stance: 0.13 });
  apex.addBox([0, 1.83, 0.15], [0.14, 0.1, 0.06], [0.11, 0.16, 0.18], material);
  apex.addBox([-0.33, 1.08, 0.03], [0.035, 0.52, 0.035], [0.08, 0.12, 0.14], material);
  apex.addBox([0.33, 1.08, 0.03], [0.035, 0.52, 0.035], [0.08, 0.12, 0.14], material);
  return apex.build();
}

function addHumanoid(builder: CharacterMeshBuilder, atlas: Record<string, UvRect>, palette: Palette, shape: { height: number; shoulder: number; torso: number; limb: number; stance: number; crouch?: number }): void {
  const crouch = shape.crouch ?? 0;
  const legHeight = shape.height * 0.29;
  const torsoHeight = shape.height * 0.3;
  const armHeight = shape.height * 0.28;
  const chestY = legHeight + crouch + torsoHeight;
  const headY = chestY + shape.height * 0.18;
  for (const side of [-1, 1]) {
    const x = side * shape.stance;
    builder.addBox([x, legHeight * 0.28, 0], [shape.limb, legHeight * 0.28, shape.limb], palette.leg, atlas.leg);
    builder.addBox([x, legHeight * 0.78 + crouch, 0], [shape.limb * 1.08, legHeight * 0.26, shape.limb * 1.12], palette.leg, atlas.leg);
    builder.addBox([side * (shape.shoulder + shape.limb * 0.55), chestY - armHeight * 0.3, 0], [shape.limb, armHeight * 0.3, shape.limb], palette.arm, atlas.arm);
    builder.addBox([side * (shape.shoulder + shape.limb * 0.72), chestY - armHeight * 0.82, 0.03], [shape.limb * 0.85, armHeight * 0.25, shape.limb * 0.85], palette.arm, atlas.arm);
  }
  builder.addBox([0, chestY - torsoHeight * 0.42, 0], [shape.torso, torsoHeight * 0.42, shape.torso * 0.56], palette.torso, atlas.torso);
  builder.addBox([0, chestY + torsoHeight * 0.06, 0.02], [shape.shoulder, torsoHeight * 0.22, shape.torso * 0.62], palette.torso, atlas.torso);
  builder.addBox([0, headY, 0.01], [shape.torso * 0.54, shape.height * 0.11, shape.torso * 0.48], palette.head, atlas.head);
}

class CharacterMeshBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly emissive: number[] = [];
  private readonly uvs: number[] = [];
  private readonly indices: number[] = [];

  addBox(center: readonly [number, number, number], half: readonly [number, number, number], color: Color, uv: UvRect): void {
    const [x, y, z] = center;
    const [hx, hy, hz] = half;
    const x0 = x - hx; const x1 = x + hx; const y0 = y - hy; const y1 = y + hy; const z0 = z - hz; const z1 = z + hz;
    this.addQuad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], color, uv);
    this.addQuad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], color, uv);
    this.addQuad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], color, uv);
    this.addQuad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], color, uv);
    this.addQuad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], color, uv);
    this.addQuad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], color, uv);
  }

  build(): MeshData {
    return { positions: new Float32Array(this.positions), normals: new Float32Array(this.normals), colors: new Float32Array(this.colors), emissive: new Float32Array(this.emissive), uvs: new Float32Array(this.uvs), indices: new Uint32Array(this.indices) };
  }

  private addQuad(points: readonly number[][], normal: readonly number[], color: Color, uv: UvRect): void {
    const base = this.positions.length / 3;
    const [u0, v0, u1, v1] = uv;
    for (const point of points) {
      this.positions.push(...point);
      this.normals.push(...normal);
      this.colors.push(...color);
      this.emissive.push(0);
    }
    this.uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
