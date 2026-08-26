import { MeshBuilder } from '@driftengine/core';
export function buildDungeonDoor() {
    const mesh = new MeshBuilder();
    mesh.addBox([0, 1.42, 0], [0.1, 1.42, 0.88], [0.1, 0.13, 0.12], 0.16, 0.15);
    mesh.addBox([0, 1.42, 0.05], [0.125, 1.16, 0.7], [0.16, 0.2, 0.17], 0.04, 0.08);
    mesh.addBox([0.14, 1.25, 0.57], [0.05, 0.05, 0.05], [0.7, 0.2, 0.06], 0.65, 0.1);
    return mesh;
}
