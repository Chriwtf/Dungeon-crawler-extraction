import { MeshBuilder } from '@driftengine/core';
export function buildRoomPropMeshes() {
    return {
        crypt: buildCrypt().build(),
        storage: buildStorage().build(),
        armory: buildArmory().build(),
        prison: buildPrison().build(),
        ritual: buildRitual().build(),
        library: buildLibrary().build(),
        guardRoom: buildGuardRoom().build(),
        reliquary: buildReliquary().build(),
        extractionRoom: buildExtractionRig().build(),
    };
}
function buildCrypt() {
    const mesh = new MeshBuilder();
    mesh.addBox([0, 0.28, 0], [0.76, 0.28, 0.36], [0.16, 0.18, 0.15], 0.1);
    mesh.addBox([0, 0.59, 0.2], [0.58, 0.08, 0.18], [0.24, 0.28, 0.22], 0.14);
    mesh.addCylinder([-0.56, 0.18, -0.4], 0.05, 0.36, 'y', [0.72, 0.58, 0.28], 0.8, 8, 0.2);
    return mesh;
}
function buildStorage() {
    const mesh = new MeshBuilder();
    mesh.addBox([-0.34, 0.26, 0], [0.32, 0.26, 0.32], [0.22, 0.16, 0.08], 0.08);
    mesh.addBox([0.36, 0.18, 0.18], [0.29, 0.18, 0.29], [0.18, 0.13, 0.07], 0.06);
    mesh.addCylinder([0.5, 0.38, -0.38], 0.19, 0.68, 'y', [0.16, 0.24, 0.2], 0.08, 12, 0.25);
    return mesh;
}
function buildArmory() {
    const mesh = new MeshBuilder();
    mesh.addBox([0, 0.58, -0.28], [0.72, 0.58, 0.07], [0.1, 0.12, 0.11], 0.15);
    mesh.addBox([-0.5, 0.34, 0], [0.04, 0.34, 0.04], [0.28, 0.3, 0.28], 0.1);
    mesh.addBox([0.5, 0.34, 0], [0.04, 0.34, 0.04], [0.28, 0.3, 0.28], 0.1);
    mesh.addBox([0, 0.86, -0.05], [0.56, 0.035, 0.035], [0.34, 0.35, 0.31], 0.2);
    return mesh;
}
function buildPrison() {
    const mesh = new MeshBuilder();
    for (let index = -2; index <= 2; index += 1) {
        mesh.addCylinder([index * 0.22, 0.72, 0], 0.035, 1.44, 'y', [0.2, 0.24, 0.22], 0.08, 8, 0.2);
    }
    mesh.addBox([0, 1.22, 0], [0.62, 0.035, 0.04], [0.16, 0.19, 0.17], 0.05);
    return mesh;
}
function buildRitual() {
    const mesh = new MeshBuilder();
    mesh.addCylinder([0, 0.25, 0], 0.72, 0.14, 'y', [0.12, 0.07, 0.06], 0.1, 12, 0.2);
    mesh.addCylinder([0, 0.58, 0], 0.36, 0.54, 'y', [0.22, 0.1, 0.08], 0.18, 10, 0.3);
    mesh.addSphere([0, 0.95, 0], 0.14, [0.95, 0.1, 0.025], 1, 8, 5);
    return mesh;
}
function buildLibrary() {
    const mesh = new MeshBuilder();
    mesh.addBox([0, 0.68, -0.22], [0.78, 0.68, 0.15], [0.12, 0.1, 0.07], 0.08);
    for (let level = 0; level < 3; level += 1) {
        mesh.addBox([0, 0.28 + level * 0.35, -0.02], [0.7, 0.03, 0.12], [0.34, 0.27, 0.14], 0.05);
    }
    return mesh;
}
function buildGuardRoom() {
    const mesh = new MeshBuilder();
    mesh.addBox([0, 0.42, 0], [0.7, 0.08, 0.42], [0.13, 0.16, 0.15], 0.1);
    mesh.addBox([-0.52, 0.22, 0.52], [0.18, 0.22, 0.18], [0.17, 0.19, 0.16], 0.1);
    mesh.addBox([0.48, 0.72, -0.12], [0.19, 0.32, 0.12], [0.08, 0.42, 0.25], 0.26, 0.2);
    return mesh;
}
function buildReliquary() {
    const mesh = new MeshBuilder();
    for (const [x, z] of [[-0.82, -0.82], [0.82, -0.82], [-0.82, 0.82], [0.82, 0.82]]) {
        mesh.addCylinder([x, 0.62, z], 0.12, 1.24, 'y', [0.13, 0.25, 0.2], 0.14, 8, 0.2);
    }
    return mesh;
}
function buildExtractionRig() {
    const mesh = new MeshBuilder();
    mesh.addBox([-0.92, 0.92, 0], [0.11, 0.92, 0.11], [0.16, 0.2, 0.18], 0.12);
    mesh.addBox([0.92, 0.92, 0], [0.11, 0.92, 0.11], [0.16, 0.2, 0.18], 0.12);
    mesh.addBox([0, 1.75, 0], [1.02, 0.1, 0.11], [0.14, 0.19, 0.17], 0.08);
    return mesh;
}
