const GUARD = {
    torso: [0.03, 0.08, 0.38, 0.43], head: [0.38, 0.02, 0.58, 0.18],
    arm: [0.57, 0.06, 0.77, 0.35], leg: [0.04, 0.58, 0.38, 0.98],
};
const CRAWLER = {
    torso: [0.2, 0.02, 0.7, 0.48], head: [0.0, 0.03, 0.2, 0.28],
    arm: [0.0, 0.34, 0.25, 0.76], leg: [0.55, 0.48, 0.96, 0.97],
};
/** Hand-authored low-poly humanoids, with each body part mapped to its atlas region. */
export function buildEnemyMeshes() {
    const guard = new CharacterMeshBuilder();
    addHumanoid(guard, GUARD, [0.88, 0.94, 0.9], { height: 1.72, shoulder: 0.35, torso: 0.27, limb: 0.095, stance: 0.17 });
    guard.addBox([0, 1.58, 0.17], [0.18, 0.07, 0.035], [0.7, 0.82, 0.78], GUARD.torso);
    const crawler = new CharacterMeshBuilder();
    addHumanoid(crawler, CRAWLER, [0.78, 0.9, 0.78], { height: 1.28, shoulder: 0.31, torso: 0.25, limb: 0.1, stance: 0.21, crouch: 0.22 });
    crawler.addBox([0, 1.03, 0.19], [0.23, 0.12, 0.08], [0.7, 0.82, 0.68], CRAWLER.torso);
    return { guard: guard.build(), crawler: crawler.build() };
}
/** The Apex is a tall, asymmetrical humanoid silhouette rather than a proxy cylinder. */
export function buildApexMesh() {
    const apex = new CharacterMeshBuilder();
    const material = [0.06, 0.08, 0.94, 0.92];
    addHumanoid(apex, { torso: material, head: material, arm: material, leg: material }, [1, 0.88, 0.8], { height: 2.02, shoulder: 0.28, torso: 0.2, limb: 0.07, stance: 0.13 });
    apex.addBox([0, 1.83, 0.15], [0.14, 0.1, 0.06], [0.38, 0.42, 0.45], material);
    apex.addBox([-0.33, 1.08, 0.03], [0.035, 0.52, 0.035], [0.3, 0.34, 0.38], material);
    apex.addBox([0.33, 1.08, 0.03], [0.035, 0.52, 0.035], [0.3, 0.34, 0.38], material);
    return apex.build();
}
function addHumanoid(builder, atlas, color, shape) {
    const crouch = shape.crouch ?? 0;
    const legHeight = shape.height * 0.29;
    const torsoHeight = shape.height * 0.3;
    const armHeight = shape.height * 0.28;
    const chestY = legHeight + crouch + torsoHeight;
    const headY = chestY + shape.height * 0.18;
    for (const side of [-1, 1]) {
        const x = side * shape.stance;
        builder.addBox([x, legHeight * 0.28, 0], [shape.limb, legHeight * 0.28, shape.limb], color, atlas.leg);
        builder.addBox([x, legHeight * 0.78 + crouch, 0], [shape.limb * 1.08, legHeight * 0.26, shape.limb * 1.12], color, atlas.leg);
        builder.addBox([side * (shape.shoulder + shape.limb * 0.55), chestY - armHeight * 0.3, 0], [shape.limb, armHeight * 0.3, shape.limb], color, atlas.arm);
        builder.addBox([side * (shape.shoulder + shape.limb * 0.72), chestY - armHeight * 0.82, 0.03], [shape.limb * 0.85, armHeight * 0.25, shape.limb * 0.85], color, atlas.arm);
    }
    builder.addBox([0, chestY - torsoHeight * 0.42, 0], [shape.torso, torsoHeight * 0.42, shape.torso * 0.56], color, atlas.torso);
    builder.addBox([0, chestY + torsoHeight * 0.06, 0.02], [shape.shoulder, torsoHeight * 0.22, shape.torso * 0.62], color, atlas.torso);
    builder.addBox([0, headY, 0.01], [shape.torso * 0.54, shape.height * 0.11, shape.torso * 0.48], color, atlas.head);
}
class CharacterMeshBuilder {
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
    addBox(center, half, color, uv) {
        const [x, y, z] = center;
        const [hx, hy, hz] = half;
        const x0 = x - hx;
        const x1 = x + hx;
        const y0 = y - hy;
        const y1 = y + hy;
        const z0 = z - hz;
        const z1 = z + hz;
        this.addQuad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], color, uv);
        this.addQuad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], color, uv);
        this.addQuad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], color, uv);
        this.addQuad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], color, uv);
        this.addQuad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], color, uv);
        this.addQuad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], color, uv);
    }
    build() {
        return { positions: new Float32Array(this.positions), normals: new Float32Array(this.normals), colors: new Float32Array(this.colors), emissive: new Float32Array(this.emissive), uvs: new Float32Array(this.uvs), indices: new Uint32Array(this.indices) };
    }
    addQuad(points, normal, color, uv) {
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
