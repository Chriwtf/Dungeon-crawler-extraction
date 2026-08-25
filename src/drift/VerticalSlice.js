import { Camera, MeshBuilder, SceneNode, createEnvironment, createRenderer, startLoop, } from '@driftengine/core';
const STEP_METRES = 2;
const PLAYER_HEIGHT = 1.65;
const CARDINALS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
];
/**
 * A deliberately small DriftEngine vertical slice. The layout stays data-light so the
 * procedural DungeonGenerator can replace it once the moment-to-moment feel is proven.
 */
export async function startVerticalSlice() {
    const app = document.querySelector('#app');
    if (app === null)
        throw new Error('Missing application root.');
    app.innerHTML = `
    <canvas id="stage" aria-label="Dungeon extraction 3D vertical slice"></canvas>
    <section class="run-hud" aria-live="polite">
      <p class="run-label">DRIFT // EXTRACTION PROTOCOL</p>
      <p id="turn-readout">TURN 001</p>
      <p id="objective-readout">OBJECTIVE: RECOVER THE RELIC</p>
      <p id="message-readout">The air is still. Move carefully.</p>
    </section>
    <section class="run-help">
      <p>W / S: MOVE &nbsp; Q / E: TURN</p>
      <p>Each action advances the dungeon.</p>
      <p id="backend-readout"></p>
    </section>`;
    const canvas = requireElement('#stage');
    const hud = {
        turn: requireElement('#turn-readout'),
        objective: requireElement('#objective-readout'),
        message: requireElement('#message-readout'),
        backend: requireElement('#backend-readout'),
    };
    const { renderer, backend, reason } = await createRenderer(canvas, {
        maxDevicePixelRatio: 1.75,
        directionalShadows: true,
        hdrScene: true,
        bloom: 0.35,
        bloomThreshold: 0.6,
    });
    hud.backend.textContent = `${backend.toUpperCase()} // ${reason}`;
    renderer.resize();
    addEventListener('resize', () => renderer.resize());
    const environment = createEnvironment({
        directionalDir: [0.25, 0.7, -0.3],
        directionalColor: [0.45, 0.55, 0.5],
        ambient: [0.04, 0.06, 0.05],
        ambientGround: [0.01, 0.015, 0.012],
        emissiveGain: 1.4,
        nightFactor: 1,
        fogColor: [0.012, 0.025, 0.02],
        fogDensity: 0.055,
        fogHeightFalloff: 0.04,
        fogBaseY: 0,
    });
    const world = renderer.createMesh(buildWorld().build());
    const relic = renderer.createMesh(buildRelic().build());
    const extraction = renderer.createMesh(buildExtraction().build());
    const identity = new SceneNode();
    identity.updateWorld();
    const relicNode = new SceneNode();
    relicNode.setPosition(26, 0.65, 0);
    const extractionNode = new SceneNode();
    extractionNode.setPosition(-4, 0.05, 0);
    const camera = new Camera();
    const player = { x: 0, z: 0 };
    let facing = 1;
    let turn = 1;
    let hasRelic = false;
    let completed = false;
    let relicSpin = 0;
    let previousRelicSpin = 0;
    const updateCamera = () => {
        const [dx, dz] = CARDINALS[facing];
        camera.position[0] = player.x;
        camera.position[1] = PLAYER_HEIGHT;
        camera.position[2] = player.z;
        camera.lookAt(player.x + dx * 6, PLAYER_HEIGHT, player.z + dz * 6);
    };
    const advanceTurn = (message) => {
        turn += 1;
        hud.turn.textContent = `TURN ${String(turn).padStart(3, '0')}`;
        hud.message.textContent = message;
    };
    const act = (key) => {
        if (completed)
            return;
        if (key === 'q' || key === 'e') {
            facing = (facing + (key === 'q' ? 3 : 1)) % CARDINALS.length;
            advanceTurn('Somewhere beyond the walls, metal shifts against stone.');
            return;
        }
        const direction = key === 'w' ? 1 : key === 's' ? -1 : 0;
        if (direction === 0)
            return;
        const [dx, dz] = CARDINALS[facing];
        const next = { x: player.x + dx * STEP_METRES * direction, z: player.z + dz * STEP_METRES * direction };
        if (!isWalkable(next)) {
            advanceTurn('The way is sealed. The sound of your attempt travels farther than it should.');
            return;
        }
        player.x = next.x;
        player.z = next.z;
        advanceTurn('Your footsteps fade into the ventilation hum.');
        if (!hasRelic && distance(player, { x: 26, z: 0 }) < 1.2) {
            hasRelic = true;
            hud.objective.textContent = 'OBJECTIVE: RETURN TO EXTRACTION';
            hud.message.textContent = 'RELIC SECURED. The extraction beacon is now active.';
        }
        if (hasRelic && distance(player, { x: -4, z: 0 }) < 1.2) {
            completed = true;
            hud.objective.textContent = 'EXTRACTION COMPLETE';
            hud.message.textContent = `RUN CLEARED IN ${turn} TURNS. Press reload to begin again.`;
        }
    };
    addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        const mapped = key === 'arrowup' ? 'w' : key === 'arrowdown' ? 's' : key === 'arrowleft' ? 'q' : key === 'arrowright' ? 'e' : key;
        if (mapped === 'w' || mapped === 's' || mapped === 'q' || mapped === 'e') {
            event.preventDefault();
            act(mapped);
        }
    });
    updateCamera();
    startLoop({
        simulate(dt) {
            previousRelicSpin = relicSpin;
            relicSpin += dt * 1.4;
        },
        render(alpha) {
            const interpolatedSpin = previousRelicSpin + (relicSpin - previousRelicSpin) * alpha;
            relicNode.setRotationAxisAngle(0, 1, 0, interpolatedSpin);
            relicNode.updateWorld();
            extractionNode.updateWorld();
            updateCamera();
            camera.updateMatrices(canvas.height > 0 ? canvas.width / canvas.height : 1);
            renderer.beginFrame([0.004, 0.009, 0.007]);
            renderer.bindMeshPass(camera, environment);
            renderer.drawMesh(world, identity.worldMatrix);
            if (!hasRelic)
                renderer.drawMesh(relic, relicNode.worldMatrix);
            renderer.drawMesh(extraction, extractionNode.worldMatrix);
            renderer.endFrame();
        },
    });
}
function buildWorld() {
    const mesh = new MeshBuilder();
    const floor = [0.07, 0.1, 0.085];
    const wall = [0.12, 0.18, 0.15];
    const trim = [0.04, 0.42, 0.24];
    mesh.addBox([0, -0.2, 0], [6, 0.2, 5], floor);
    mesh.addBox([11, -0.2, 0], [5, 0.2, 1.5], floor);
    mesh.addBox([23, -0.2, 0], [7, 0.2, 6], floor);
    addRoomWalls(mesh, 0, 0, 6, 5, wall, trim, 'east');
    addRoomWalls(mesh, 23, 0, 7, 6, wall, trim, 'west');
    mesh.addBox([11, 1.8, -1.5], [5, 1.8, 0.18], wall);
    mesh.addBox([11, 1.8, 1.5], [5, 1.8, 0.18], wall);
    mesh.addBox([11, 3.55, 0], [5, 0.1, 1.5], trim);
    return mesh;
}
function addRoomWalls(mesh, x, z, halfWidth, halfDepth, wall, trim, doorway) {
    mesh.addBox([x, 1.8, z - halfDepth], [halfWidth, 1.8, 0.18], wall);
    mesh.addBox([x, 1.8, z + halfDepth], [halfWidth, 1.8, 0.18], wall);
    const closedX = doorway === 'east' ? x - halfWidth : x + halfWidth;
    mesh.addBox([closedX, 1.8, z], [0.18, 1.8, halfDepth], wall);
    const openX = doorway === 'east' ? x + halfWidth : x - halfWidth;
    mesh.addBox([openX, 1.8, z - (halfDepth + 1.5) / 2], [0.18, 1.8, (halfDepth - 1.5) / 2], wall);
    mesh.addBox([openX, 1.8, z + (halfDepth + 1.5) / 2], [0.18, 1.8, (halfDepth - 1.5) / 2], wall);
    mesh.addBox([x, 3.55, z], [halfWidth, 0.1, halfDepth], trim);
}
function buildRelic() {
    const mesh = new MeshBuilder();
    mesh.addBox([0, 0, 0], [0.35, 0.5, 0.35], [0.1, 1, 0.55]);
    mesh.addBox([0, 0.55, 0], [0.15, 0.15, 0.15], [0.75, 1, 0.85]);
    return mesh;
}
function buildExtraction() {
    const mesh = new MeshBuilder();
    mesh.addBox([0, 0, 0], [0.8, 0.04, 0.8], [0.08, 0.9, 0.42]);
    mesh.addBox([0, 0.08, 0], [0.35, 0.04, 0.35], [0.4, 1, 0.72]);
    return mesh;
}
function isWalkable(position) {
    const inFirstRoom = position.x >= -5 && position.x <= 5 && position.z >= -4 && position.z <= 4;
    const inCorridor = position.x >= 5 && position.x <= 17 && position.z >= -1 && position.z <= 1;
    const inSecondRoom = position.x >= 17 && position.x <= 29 && position.z >= -5 && position.z <= 5;
    return inFirstRoom || inCorridor || inSecondRoom;
}
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}
function requireElement(selector) {
    const element = document.querySelector(selector);
    if (element === null)
        throw new Error(`Missing required element: ${selector}`);
    return element;
}
