export function buildLootPropMeshes() {
    const document = new TexturedPropBuilder();
    document.addBox(0, 0.08, 0, 0.46, 0.08, 0.33);
    const sample = new TexturedPropBuilder();
    sample.addCylinder(0, 0.29, 0, 0.16, 0.52, 14);
    sample.addCylinder(0, 0.59, 0, 0.19, 0.09, 14);
    const component = new TexturedPropBuilder();
    component.addBox(0, 0.12, 0, 0.4, 0.12, 0.28);
    component.addBox(0, 0.28, 0, 0.28, 0.05, 0.18);
    component.addCylinder(-0.26, 0.29, -0.15, 0.07, 0.1, 10);
    component.addCylinder(0.26, 0.29, -0.15, 0.07, 0.1, 10);
    component.addCylinder(-0.26, 0.29, 0.15, 0.07, 0.1, 10);
    component.addCylinder(0.26, 0.29, 0.15, 0.07, 0.1, 10);
    const artifact = new TexturedPropBuilder();
    artifact.addShard();
    return { document: document.build(), sample: sample.build(), component: component.build(), artifact: artifact.build() };
}
class TexturedPropBuilder {
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
    addBox(x, y, z, halfX, halfY, halfZ) {
        const x0 = x - halfX;
        const x1 = x + halfX;
        const y0 = y - halfY;
        const y1 = y + halfY;
        const z0 = z - halfZ;
        const z1 = z + halfZ;
        this.addQuad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0]);
        this.addQuad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0]);
        this.addQuad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]);
        this.addQuad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]);
        this.addQuad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]);
        this.addQuad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]);
    }
    addCylinder(x, y, z, radius, height, segments) {
        const y0 = y - height / 2;
        const y1 = y + height / 2;
        for (let index = 0; index < segments; index += 1) {
            const angle0 = index / segments * Math.PI * 2;
            const angle1 = (index + 1) / segments * Math.PI * 2;
            const p0 = [x + Math.sin(angle0) * radius, y0, z + Math.cos(angle0) * radius];
            const p1 = [x + Math.sin(angle1) * radius, y0, z + Math.cos(angle1) * radius];
            const p2 = [x + Math.sin(angle1) * radius, y1, z + Math.cos(angle1) * radius];
            const p3 = [x + Math.sin(angle0) * radius, y1, z + Math.cos(angle0) * radius];
            this.addQuad([p0, p1, p2, p3], [Math.sin((angle0 + angle1) / 2), 0, Math.cos((angle0 + angle1) / 2)], 1 / segments, 1, index / segments);
        }
    }
    addShard() {
        const apex = [0.08, 0.78, -0.04];
        const north = [-0.26, 0.07, 0.22];
        const east = [0.34, 0.11, 0.14];
        const south = [0.2, 0.04, -0.32];
        const west = [-0.3, 0.15, -0.2];
        this.addTriangle([apex, north, east]);
        this.addTriangle([apex, east, south]);
        this.addTriangle([apex, south, west]);
        this.addTriangle([apex, west, north]);
        this.addTriangle([north, west, south]);
        this.addTriangle([north, south, east]);
    }
    build() {
        return {
            positions: new Float32Array(this.positions), normals: new Float32Array(this.normals), colors: new Float32Array(this.colors),
            emissive: new Float32Array(this.emissive), uvs: new Float32Array(this.uvs), indices: new Uint32Array(this.indices),
        };
    }
    addQuad(points, normal, u = 1, v = 1, uOffset = 0) {
        const at = this.positions.length / 3;
        for (const point of points)
            this.addVertex(point, normal);
        this.uvs.push(uOffset, 0, uOffset + u, 0, uOffset + u, v, uOffset, v);
        this.indices.push(at, at + 1, at + 2, at, at + 2, at + 3);
    }
    addTriangle(points) {
        const normal = faceNormal(points[0], points[1], points[2]);
        const at = this.positions.length / 3;
        for (const point of points)
            this.addVertex(point, normal);
        this.uvs.push(0.5, 0, 0, 1, 1, 1);
        this.indices.push(at, at + 1, at + 2);
    }
    addVertex(point, normal) {
        this.positions.push(...point);
        this.normals.push(...normal);
        this.colors.push(1, 1, 1);
        this.emissive.push(0);
    }
}
function faceNormal(a, b, c) {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const x = uy * vz - uz * vy;
    const y = uz * vx - ux * vz;
    const z = ux * vy - uy * vx;
    const length = Math.hypot(x, y, z) || 1;
    return [x / length, y / length, z / length];
}
