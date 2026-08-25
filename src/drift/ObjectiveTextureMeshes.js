export function buildObjectiveTextureMeshes() {
    const relicPedestal = new ObjectiveMeshBuilder();
    relicPedestal.addBox(0, 0.51, 0, 0.76, 0.51, 0.76);
    const extractionHatch = new ObjectiveMeshBuilder();
    extractionHatch.addTexturedDisc(1.13, 0.21, 16);
    return {
        relicPedestal: relicPedestal.build(),
        extractionHatch: extractionHatch.build(),
    };
}
class ObjectiveMeshBuilder {
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
        this.addQuad([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0]);
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
    addTexturedDisc(radius, y, segments) {
        const centre = this.positions.length / 3;
        this.positions.push(0, y, 0);
        this.normals.push(0, 1, 0);
        this.colors.push(1, 1, 1);
        this.emissive.push(0);
        this.uvs.push(0.5, 0.5);
        for (let index = 0; index <= segments; index += 1) {
            const angle = (index / segments) * Math.PI * 2;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            this.positions.push(x, y, z);
            this.normals.push(0, 1, 0);
            this.colors.push(1, 1, 1);
            this.emissive.push(0);
            this.uvs.push(0.5 + x / (radius * 2), 0.5 - z / (radius * 2));
        }
        for (let index = 0; index < segments; index += 1) {
            this.indices.push(centre, centre + index + 1, centre + index + 2);
        }
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
    addQuad(points, normal) {
        const at = this.positions.length / 3;
        for (const point of points) {
            this.positions.push(...point);
            this.normals.push(...normal);
            this.colors.push(1, 1, 1);
            this.emissive.push(0);
        }
        this.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        this.indices.push(at, at + 1, at + 2, at, at + 2, at + 3);
    }
}
