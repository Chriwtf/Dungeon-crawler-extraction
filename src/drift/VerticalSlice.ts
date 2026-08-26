import {
  Camera,
  MeshBuilder,
  SceneNode,
  createPointLightBuffer,
  createEnvironment,
  createRenderer,
  selectPointLights,
  startLoop,
} from '@driftengine/core';
import type { PointLightSource } from '@driftengine/core';
import { ApexDirector } from '../game/core/ApexDirector';
import { placeRunLoot } from '../game/core/RunLoot';
import { propagateNoise } from '../game/core/NoiseSystem';
import { UPGRADE_DEFINITIONS, bankCredits, buyUpgrade, getCargoNoiseReduction, getCarryCapacity, getTorchSight, loadProgression, saveProgression } from '../game/core/RunProgression';
import { RunSimulation } from '../game/core/RunSimulation';
import { generateDungeon } from '../game/world/DungeonGenerator';
import { buildDungeonMeshes, pointToWorld, worldToPoint } from './ProceduralDungeon3d';
import { buildObjectiveTextureMeshes } from './ObjectiveTextureMeshes';
import { buildLootPropMeshes } from './LootProps3d';
import floorTextureUrl from '../assets/textures/industrial-floor-albedo.png?url';
import wallTextureUrl from '../assets/textures/industrial-wall-albedo.png?url';
import relicTextureUrl from '../assets/textures/relic-pedestal-albedo.png?url';
import extractionTextureUrl from '../assets/textures/extraction-hatch-albedo.png?url';
import documentLootTextureUrl from '../assets/textures/loot-document-albedo.png?url';
import sampleLootTextureUrl from '../assets/textures/loot-sample-albedo.png?url';
import componentLootTextureUrl from '../assets/textures/loot-component-albedo.png?url';
import artifactLootTextureUrl from '../assets/textures/loot-artifact-albedo.png?url';

const STEP_METRES = 2;
const EXTRACTION_RANGE = 2.1;
const PLAYER_HEIGHT = 1.65;
const RUN_SEED = 827491;
const CARDINALS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

interface Hud {
  readonly turn: HTMLElement;
  readonly objective: HTMLElement;
  readonly loot: HTMLElement;
  readonly stash: HTMLElement;
  readonly pressure: HTMLElement;
  readonly echo: HTMLElement;
  readonly apex: HTMLElement;
  readonly visibility: HTMLElement;
  readonly message: HTMLElement;
  readonly backend: HTMLElement;
}

interface Position {
  x: number;
  z: number;
}

/**
 * A deliberately small DriftEngine vertical slice. The layout stays data-light so the
 * procedural DungeonGenerator can replace it once the moment-to-moment feel is proven.
 */
export async function startVerticalSlice(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (app === null) throw new Error('Missing application root.');

  app.innerHTML = `
    <canvas id="stage" aria-label="Dungeon extraction 3D vertical slice"></canvas>
    <section class="run-hud" aria-live="polite">
      <p class="run-label">DRIFT // EXTRACTION PROTOCOL</p>
      <p id="turn-readout">TURN 000</p>
      <p id="objective-readout">OBJECTIVE: RECOVER THE RELIC</p>
      <p id="loot-readout">LOOT: 0 CR // LOAD: 0 KG</p>
      <p id="stash-readout">STASH: 0 CR // EXTRACT TO BANK</p>
      <p id="pressure-readout">THREAT: 0% // NOISE: 0</p>
      <p id="echo-readout">ECHO: SILENT</p>
      <p id="apex-readout">STALKER: DORMANT</p>
      <p id="visibility-readout">TORCH: ON // SIGHT: 8M</p>
      <p id="message-readout">The air is still. Move carefully.</p>
    </section>
    <section class="run-help">
      <p>W / S: MOVE &nbsp; Q / E: TURN &nbsp; F: TORCH &nbsp; X: EXTRACT &nbsp; U: UPGRADES</p>
      <p>Each action advances the dungeon.</p>
      <p id="backend-readout"></p>
    </section>
    <section id="upgrade-panel" class="upgrade-panel" hidden aria-label="Upgrade terminal">
      <p class="run-label">FIELD WORKBENCH // NEXT RUN</p>
      <p id="upgrade-balance"></p>
      <div id="upgrade-options"></div>
      <p class="upgrade-close">U / ESC: CLOSE</p>
    </section>`;

  const canvas = requireElement<HTMLCanvasElement>('#stage');
  const hud: Hud = {
    turn: requireElement('#turn-readout'),
    objective: requireElement('#objective-readout'),
    loot: requireElement('#loot-readout'),
    stash: requireElement('#stash-readout'),
    pressure: requireElement('#pressure-readout'),
    echo: requireElement('#echo-readout'),
    apex: requireElement('#apex-readout'),
    visibility: requireElement('#visibility-readout'),
    message: requireElement('#message-readout'),
    backend: requireElement('#backend-readout'),
  };
  const upgradePanel = requireElement<HTMLElement>('#upgrade-panel');
  const upgradeBalance = requireElement<HTMLElement>('#upgrade-balance');
  const upgradeOptions = requireElement<HTMLDivElement>('#upgrade-options');
  let progression = loadProgression();
  const torchSight = getTorchSight(progression);
  const cargoNoiseReduction = getCargoNoiseReduction(progression);
  const carryCapacity = getCarryCapacity(progression);
  let upgradePanelOpen = false;

  const { renderer, backend, reason } = await createRenderer(canvas, {
    maxDevicePixelRatio: 1.75,
    directionalShadows: true,
    hdrScene: true,
    bloom: 0.35,
    bloomThreshold: 0.6,
    outputTransform: 'aces',
    outputExposure: 1.65,
  });
  hud.backend.textContent = `${backend.toUpperCase()} // ${reason}`;
  renderer.resize();
  addEventListener('resize', () => renderer.resize());

  const environment = createEnvironment({
    directionalDir: [0.25, 0.7, -0.3],
    directionalColor: [0.08, 0.11, 0.1],
    ambient: [0.012, 0.018, 0.015],
    ambientGround: [0.004, 0.006, 0.005],
    emissiveGain: 0.5,
    nightFactor: 1,
    fogColor: [0.012, 0.025, 0.02],
    fogDensity: 0.012,
    fogHeightFalloff: 0.04,
    fogBaseY: 0,
  });

  const dungeon = generateDungeon({ width: 20, height: 16, targetRooms: 12, minRoomSize: 4, maxRoomSize: 6 }, RUN_SEED);
  const dungeonMeshes = buildDungeonMeshes(dungeon);
  const floor = renderer.createMesh(dungeonMeshes.floor);
  const walls = renderer.createMesh(dungeonMeshes.walls);
  const [floorTexture, wallTexture, relicTexture, extractionTexture, documentLootTexture, sampleLootTexture, componentLootTexture, artifactLootTexture] = await Promise.all([
    loadSurfaceTexture(renderer, floorTextureUrl),
    loadSurfaceTexture(renderer, wallTextureUrl),
    loadSurfaceTexture(renderer, relicTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, extractionTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, documentLootTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, sampleLootTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, componentLootTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, artifactLootTextureUrl, 'clamp'),
  ]);
  const relicPosition = pointToWorld(dungeon, dungeon.objective);
  const extractionPosition = pointToWorld(dungeon, dungeon.extraction);
  const startPosition = pointToWorld(dungeon, dungeon.playerStart);
  const lootSpawns = placeRunLoot(dungeon, RUN_SEED);
  const relicPedestal = renderer.createMesh(buildRelicPedestal().build());
  const relicCore = renderer.createMesh(buildRelicCore().build());
  const extractionFrame = renderer.createMesh(buildExtractionFrame().build());
  const extractionLocked = renderer.createMesh(buildExtractionSignal([1, 0.08, 0.05]).build());
  const extractionReady = renderer.createMesh(buildExtractionSignal([0.1, 1, 0.45]).build());
  const apexMesh = renderer.createMesh(buildApex().build());
  const objectiveTextures = buildObjectiveTextureMeshes();
  const relicTexturedPedestal = renderer.createMesh(objectiveTextures.relicPedestal);
  const texturedExtractionHatch = renderer.createMesh(objectiveTextures.extractionHatch);
  const lootProps = buildLootPropMeshes();
  const lootMeshes = {
    document: renderer.createMesh(lootProps.document),
    sample: renderer.createMesh(lootProps.sample),
    component: renderer.createMesh(lootProps.component),
    artifact: renderer.createMesh(lootProps.artifact),
  };
  const lootTextures = {
    document: documentLootTexture,
    sample: sampleLootTexture,
    component: componentLootTexture,
    artifact: artifactLootTexture,
  };
  const identity = new SceneNode();
  identity.updateWorld();

  const relicPedestalNode = new SceneNode();
  relicPedestalNode.setPosition(relicPosition.x, 0, relicPosition.z);
  const relicNode = new SceneNode();
  relicNode.setPosition(relicPosition.x, 0.65, relicPosition.z);
  const extractionNode = new SceneNode();
  extractionNode.setPosition(extractionPosition.x, 0.05, extractionPosition.z);
  const lootNodes = lootSpawns.map((loot) => {
    const position = pointToWorld(dungeon, loot.point);
    const node = new SceneNode();
    node.setPosition(position.x, 0, position.z);
    return node;
  });
  const apexNode = new SceneNode();

  const camera = new Camera();
  const player: Position = { x: startPosition.x, z: startPosition.z };
  let facing = 1;
  const simulation = new RunSimulation(RUN_SEED);
  const apex = new ApexDirector(dungeon);
  let apexVisible = false;
  let hasRelic = false;
  let completed = false;
  let lootValue = 0;
  let lootWeight = 0;
  const collectedLoot = new Set<string>();
  let torchOn = true;
  let relicSpin = 0;
  let previousRelicSpin = 0;
  const lightBuffer = createPointLightBuffer();

  const updateCamera = () => {
    const [dx, dz] = CARDINALS[facing];
    camera.position[0] = player.x;
    camera.position[1] = PLAYER_HEIGHT;
    camera.position[2] = player.z;
    camera.lookAt(player.x + dx * 6, PLAYER_HEIGHT, player.z + dz * 6);
  };

  const updateStash = () => {
    hud.stash.textContent = `STASH: ${progression.credits} CR // EXTRACT TO BANK`;
  };
  const renderUpgradePanel = () => {
    upgradeBalance.textContent = `AVAILABLE: ${progression.credits} CR`;
    upgradeOptions.innerHTML = (Object.keys(UPGRADE_DEFINITIONS) as Array<keyof typeof UPGRADE_DEFINITIONS>).map((key) => {
      const definition = UPGRADE_DEFINITIONS[key];
      const level = progression.upgrades[key];
      const cost = definition.costs[level];
      const status = cost === undefined ? 'MAXED' : `${cost} CR`;
      return `<button class="upgrade-option" data-upgrade="${key}" ${cost === undefined || progression.credits < cost ? 'disabled' : ''}>
        <span>${definition.label} // LVL ${level}/2</span><small>${definition.description}</small><strong>${status}</strong>
      </button>`;
    }).join('');
  };
  const toggleUpgradePanel = () => {
    upgradePanelOpen = !upgradePanelOpen;
    upgradePanel.hidden = !upgradePanelOpen;
    if (upgradePanelOpen) renderUpgradePanel();
  };
  updateStash();

  upgradeOptions.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-upgrade]');
    if (button === null) return;
    const next = buyUpgrade(progression, button.dataset.upgrade as keyof typeof UPGRADE_DEFINITIONS);
    if (next === null) return;
    progression = next;
    saveProgression(progression);
    updateStash();
    renderUpgradePanel();
  });

  const advanceTurn = (action: 'move' | 'turn' | 'blocked' | 'torch', message: string) => {
    const event = simulation.advance(action, message, lootWeight, cargoNoiseReduction);
    const pulse = propagateNoise(dungeon, worldToPoint(dungeon, player.x, player.z), event.noise, event.noiseLevel);
    const apexEvent = apex.advance(dungeon, worldToPoint(dungeon, player.x, player.z), pulse, event.pressure, event.turn, torchOn);
    const apexWorld = pointToWorld(dungeon, apexEvent.position);
    apexNode.setPosition(apexWorld.x, 0, apexWorld.z);
    apexVisible = apexEvent.visible;
    hud.turn.textContent = `TURN ${String(event.turn).padStart(3, '0')}`;
    hud.pressure.textContent = `THREAT: ${event.pressure}% // NOISE: ${event.noiseLevel}`;
    hud.echo.textContent = pulse.intensity === 0
      ? 'ECHO: FADING'
      : `ECHO: ${pulse.reachedTiles} TILES // RANGE: ${pulse.radiusTiles * STEP_METRES}M`;
    hud.apex.textContent = `STALKER: ${apexEvent.mode.toUpperCase()}`;
    hud.message.textContent = apexEvent.message ?? event.message;
    if (apexEvent.captured) {
      completed = true;
      hud.objective.textContent = 'RUN LOST // CARGO ABANDONED';
      hud.message.textContent = 'THE APEX FOUND YOU. NOTHING WAS BANKED.';
    }
  };

  const completeExtraction = () => {
    completed = true;
    progression = bankCredits(progression, lootValue);
    saveProgression(progression);
    hud.stash.textContent = `STASH: ${progression.credits} CR // RUN BANKED`;
    hud.objective.textContent = 'EXTRACTION COMPLETE';
    hud.message.textContent = `EXTRACTED ${lootValue} CR IN ${simulation.turn} TURNS. Press reload to begin again.`;
  };

  const act = (key: string) => {
    if (completed) return;

    if (key === 'f') {
      torchOn = !torchOn;
      hud.visibility.textContent = torchOn ? `TORCH: ON // SIGHT: ${torchSight}M` : 'TORCH: OFF // SIGHT: 2M';
      advanceTurn('torch', torchOn ? 'The torch wakes with a dry electrical click.' : 'You kill the torch. The dark closes around you.');
      return;
    }

    if (key === 'x') {
      if (!hasRelic) {
        hud.message.textContent = 'EXTRACTION LOCKED. RECOVER THE RELIC FIRST.';
      } else if (distance(player, extractionPosition) > EXTRACTION_RANGE) {
        hud.message.textContent = 'MOVE CLOSER TO THE EXTRACTION HATCH.';
      } else {
        completeExtraction();
      }
      return;
    }

    if (key === 'q' || key === 'e') {
      facing = (facing + (key === 'q' ? 3 : 1)) % CARDINALS.length;
      advanceTurn('turn', 'Somewhere beyond the walls, metal shifts against stone.');
      return;
    }

    const direction = key === 'w' ? 1 : key === 's' ? -1 : 0;
    if (direction === 0) return;
    const [dx, dz] = CARDINALS[facing];
    const next = { x: player.x + dx * STEP_METRES * direction, z: player.z + dz * STEP_METRES * direction };
    if (!isWalkable(dungeon, next)) {
      advanceTurn('blocked', 'The way is sealed. The sound of your attempt travels farther than it should.');
      return;
    }

    player.x = next.x;
    player.z = next.z;
    if (hasRelic && distance(player, extractionPosition) <= EXTRACTION_RANGE) {
      completeExtraction();
      return;
    }
    advanceTurn('move', 'Your footsteps fade into the ventilation hum.');
    if (completed) return;

    const recoveredLoot = lootSpawns.find((loot) =>
      !collectedLoot.has(loot.id) && distance(player, pointToWorld(dungeon, loot.point)) < 1.2,
    );
    if (recoveredLoot !== undefined) {
      if (lootWeight + recoveredLoot.weight > carryCapacity) {
        hud.message.textContent = `LOAD LIMIT ${carryCapacity} KG. DROP CARGO OR LEAVE ${recoveredLoot.name.toUpperCase()}.`;
        return;
      }
      collectedLoot.add(recoveredLoot.id);
      lootValue += recoveredLoot.value;
      lootWeight += recoveredLoot.weight;
      hud.loot.textContent = `LOOT: ${lootValue} CR // LOAD: ${lootWeight} KG`;
      hud.message.textContent = `SECURED: ${recoveredLoot.name.toUpperCase()} // +${recoveredLoot.value} CR // HEAVIER STEPS`;
    }

    if (!hasRelic && distance(player, relicPosition) < 1.2) {
      hasRelic = true;
      hud.objective.textContent = 'OBJECTIVE: RETURN TO EXTRACTION';
      hud.message.textContent = 'RELIC SECURED. The extraction beacon is now active.';
    }
  };

  addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'u' || key === 'escape') {
      if (key === 'u' || upgradePanelOpen) toggleUpgradePanel();
      return;
    }
    if (upgradePanelOpen) return;
    const mapped = key === 'arrowup' ? 'w' : key === 'arrowdown' ? 's' : key === 'arrowleft' ? 'q' : key === 'arrowright' ? 'e' : key;
    if (mapped === 'w' || mapped === 's' || mapped === 'q' || mapped === 'e' || mapped === 'f' || mapped === 'x') {
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
      relicPedestalNode.updateWorld();
      relicNode.updateWorld();
      extractionNode.updateWorld();
      for (const node of lootNodes) node.updateWorld();
      apexNode.updateWorld();
      updateCamera();
      camera.updateMatrices(canvas.height > 0 ? canvas.width / canvas.height : 1);

      const lights: PointLightSource[] = torchOn
        ? [{
            x: player.x,
            y: PLAYER_HEIGHT - 0.2,
            z: player.z,
            r: 4.8,
            g: 4.5,
            b: 3.8,
            radius: torchSight,
            flicker: 0,
            shadowNear: 0.15,
            sourceRadius: 0.08,
          }]
        : [];
      if (!hasRelic) {
        lights.push({
          x: relicPosition.x,
          y: 1.5,
          z: relicPosition.z,
          r: 0.3,
          g: 1.2,
          b: 0.95,
          radius: 3.2,
          flicker: 0,
          shadowNear: 0.1,
          sourceRadius: 0.06,
        });
      }
      lights.push({
        x: extractionPosition.x,
        y: 0.25,
        z: extractionPosition.z,
        r: hasRelic ? 0.15 : 1.05,
        g: hasRelic ? 0.9 : 0.05,
        b: hasRelic ? 0.35 : 0.03,
        radius: 2.4,
        flicker: 0,
        shadowNear: 0.1,
        sourceRadius: 0.05,
      });
      selectPointLights(lights, player.x, PLAYER_HEIGHT, player.z, lightBuffer, 0);
      environment.lightCount = lightBuffer.count;
      environment.lightPositions = lightBuffer.positions;
      environment.lightColors = lightBuffer.colors;
      environment.lightRadii = lightBuffer.radii;
      environment.lightSourceRadii = lightBuffer.sourceRadii;
      environment.lightWeights = lightBuffer.weights;
      environment.activeLightWorldIndices = lightBuffer.sourceIndex;

      renderer.beginFrame([0.004, 0.009, 0.007]);
      renderer.bindMeshPass(camera, environment);
      renderer.setSurfaceTexture(floorTexture, 1.4, 1.4);
      renderer.drawMesh(floor, identity.worldMatrix);
      renderer.setSurfaceTexture(wallTexture, 1, 1.8);
      renderer.drawMesh(walls, identity.worldMatrix);
      renderer.setSurfaceTexture(null);
      if (!hasRelic) {
        renderer.drawMesh(relicPedestal, relicPedestalNode.worldMatrix);
        renderer.setSurfaceTexture(relicTexture);
        renderer.drawMesh(relicTexturedPedestal, relicPedestalNode.worldMatrix);
        renderer.setSurfaceTexture(null);
        renderer.drawMesh(relicCore, relicNode.worldMatrix);
      }
      for (let index = 0; index < lootSpawns.length; index += 1) {
        const loot = lootSpawns[index];
        if (!collectedLoot.has(loot.id)) {
          renderer.setSurfaceTexture(lootTextures[loot.kind]);
          renderer.drawMesh(lootMeshes[loot.kind], lootNodes[index].worldMatrix);
        }
      }
      renderer.setSurfaceTexture(null);
      if (apexVisible) renderer.drawMesh(apexMesh, apexNode.worldMatrix);
      renderer.drawMesh(extractionFrame, extractionNode.worldMatrix);
      renderer.setSurfaceTexture(extractionTexture);
      renderer.drawMesh(texturedExtractionHatch, extractionNode.worldMatrix);
      renderer.setSurfaceTexture(null);
      renderer.drawMesh(hasRelic ? extractionReady : extractionLocked, extractionNode.worldMatrix);
      renderer.endFrame();
    },
  });
}


function buildRelicPedestal(): MeshBuilder {
  const mesh = new MeshBuilder();
  mesh.addCylinder([0, 0.12, 0], 0.78, 0.12, 'y', [0.08, 0.12, 0.11], 0, 12, 0.2);
  mesh.addCylinder([0, 0.42, 0], 0.42, 0.22, 'y', [0.13, 0.2, 0.18], 0, 8, 0.35);
  mesh.addBox([0.43, 0.66, 0], [0.05, 0.22, 0.05], [0.12, 0.55, 0.4], 0.15, 0.5);
  mesh.addBox([-0.43, 0.66, 0], [0.05, 0.22, 0.05], [0.12, 0.55, 0.4], 0.15, 0.5);
  mesh.addBox([0, 0.66, 0.43], [0.05, 0.22, 0.05], [0.12, 0.55, 0.4], 0.15, 0.5);
  mesh.addBox([0, 0.66, -0.43], [0.05, 0.22, 0.05], [0.12, 0.55, 0.4], 0.15, 0.5);
  return mesh;
}

function buildRelicCore(): MeshBuilder {
  const mesh = new MeshBuilder();
  mesh.addCylinder([0, 1.05, 0], 0.18, 0.42, 'y', [0.08, 0.95, 0.68], 1, 6, 0.65);
  mesh.addSphere([0, 1.48, 0], 0.22, [0.3, 1, 0.82], 1, 12, 6);
  return mesh;
}

function buildApex(): MeshBuilder {
  const mesh = new MeshBuilder();
  mesh.addCylinder([0, 0.92, 0], 0.2, 0.85, 'y', [0.015, 0.028, 0.022], 0, 8, 0.2);
  mesh.addSphere([0, 1.52, 0], 0.27, [0.035, 0.07, 0.052], 0.05, 10, 6);
  mesh.addBox([0.34, 0.95, 0], [0.05, 0.42, 0.05], [0.02, 0.06, 0.04], 0.2, 0.4);
  mesh.addBox([-0.34, 0.95, 0], [0.05, 0.42, 0.05], [0.02, 0.06, 0.04], 0.2, 0.4);
  mesh.addSphere([0, 1.55, 0.23], 0.055, [0.85, 0.08, 0.025], 1, 8, 5);
  return mesh;
}

function buildExtractionFrame(): MeshBuilder {
  const mesh = new MeshBuilder();
  mesh.addCylinder([0, 0.06, 0], 1.25, 0.06, 'y', [0.1, 0.13, 0.12], 0, 12, 0.55);
  mesh.addCylinder([0, 0.13, 0], 0.88, 0.05, 'y', [0.025, 0.035, 0.03], 0, 12, 0.2);
  mesh.addBox([0.98, 0.22, 0], [0.1, 0.13, 0.25], [0.22, 0.28, 0.24], 0, 0.5);
  mesh.addBox([-0.98, 0.22, 0], [0.1, 0.13, 0.25], [0.22, 0.28, 0.24], 0, 0.5);
  mesh.addBox([0, 0.22, 0.98], [0.25, 0.13, 0.1], [0.22, 0.28, 0.24], 0, 0.5);
  mesh.addBox([0, 0.22, -0.98], [0.25, 0.13, 0.1], [0.22, 0.28, 0.24], 0, 0.5);
  return mesh;
}

function buildExtractionSignal(color: [number, number, number]): MeshBuilder {
  const mesh = new MeshBuilder();
  mesh.addCylinder([0, 0.2, 0], 0.46, 0.025, 'y', color, 1, 12, 0.2);
  mesh.addBox([0, 0.31, 0.74], [0.18, 0.04, 0.05], color, 1);
  mesh.addBox([0, 0.31, -0.74], [0.18, 0.04, 0.05], color, 1);
  mesh.addBox([0.74, 0.31, 0], [0.05, 0.04, 0.18], color, 1);
  mesh.addBox([-0.74, 0.31, 0], [0.05, 0.04, 0.18], color, 1);
  return mesh;
}

function isWalkable(dungeon: ReturnType<typeof generateDungeon>, position: Position): boolean {
  const point = worldToPoint(dungeon, position.x, position.z);
  return dungeon.tiles[point.y]?.[point.x] !== undefined && dungeon.tiles[point.y][point.x] !== 'wall';
}

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing required element: ${selector}`);
  return element;
}

async function loadSurfaceTexture(
  renderer: Awaited<ReturnType<typeof createRenderer>>['renderer'],
  url: string,
  wrap: 'clamp' | 'repeat' = 'repeat',
) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load dungeon texture: ${url}`);
  const bitmap = await createImageBitmap(await response.blob());
  return renderer.createSurfaceTexture(bitmap, { anisotropy: 4, colorSpace: 'srgb', wrap });
}
