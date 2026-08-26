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
import { loadModule } from 'driftscript';
import { ApexDirector, type ApexMode } from '../game/core/ApexDirector';
import { DoorSystem } from '../game/core/DoorSystem';
import { EnemyDirector, type EnemySnapshot } from '../game/core/EnemyDirector';
import { PlayerCombat } from '../game/core/PlayerCombat';
import { placeRunContainers, type RunContainer } from '../game/core/RunContainers';
import { placeRunLoot } from '../game/core/RunLoot';
import { propagateNoise } from '../game/core/NoiseSystem';
import { UPGRADE_DEFINITIONS, bankCredits, buyUpgrade, getCargoNoiseReduction, getCarryCapacity, getTorchSight, loadProgression, saveProgression } from '../game/core/RunProgression';
import { RunSimulation } from '../game/core/RunSimulation';
import { ExplorationMemory } from '../game/world/ExplorationMemory';
import { generateDungeon, type DungeonData, type Point } from '../game/world/DungeonGenerator';
import { TILE_METRES, buildDungeonMeshes, pointToWorld, worldToPoint } from './ProceduralDungeon3d';
import { buildObjectiveTextureMeshes } from './ObjectiveTextureMeshes';
import { buildLootPropMeshes } from './LootProps3d';
import { buildDungeonDoor } from './DoorProps3d';
import { buildApexMesh, buildEnemyMeshes } from './EnemyProps3d';
import { buildContainerMeshes } from './ContainerProps3d';
import { buildRoomPropMeshes } from './RoomProps3d';
import { RunAudio } from './RunAudio';
import floorTextureUrl from '../assets/textures/industrial-floor-albedo.png?url';
import wallTextureUrl from '../assets/textures/industrial-wall-albedo.png?url';
import relicTextureUrl from '../assets/textures/relic-pedestal-albedo.png?url';
import extractionTextureUrl from '../assets/textures/extraction-hatch-albedo.png?url';
import documentLootTextureUrl from '../assets/textures/loot-document-albedo.png?url';
import sampleLootTextureUrl from '../assets/textures/loot-sample-albedo.png?url';
import componentLootTextureUrl from '../assets/textures/loot-component-albedo.png?url';
import artifactLootTextureUrl from '../assets/textures/loot-artifact-albedo.png?url';
import guardMaterialTextureUrl from '../assets/textures/guard-material-albedo.png?url';
import crawlerMaterialTextureUrl from '../assets/textures/crawler-material-albedo.png?url';
import apexMaterialTextureUrl from '../assets/textures/apex-material-albedo.png?url';
import equipmentMaterialTextureUrl from '../assets/textures/equipment-material-albedo.png?url';
import * as atmosphereScript from './scripts/Atmosphere.drs';
import * as facilityDirectorScript from './scripts/FacilityDirector.drs';
import * as relicProtocolScript from './scripts/RelicProtocol.drs';

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
  readonly keys: HTMLElement;
  readonly health: HTMLElement;
  readonly pressure: HTMLElement;
  readonly echo: HTMLElement;
  readonly facility: HTMLElement;
  readonly apex: HTMLElement;
  readonly visibility: HTMLElement;
  readonly message: HTMLElement;
  readonly interaction: HTMLElement;
  readonly backend: HTMLElement;
}

interface Position {
  x: number;
  z: number;
}

interface AlarmState {
  level: number;
}

interface FacilityState {
  mode: number;
}

interface RelicState {
  secured: number;
  escapeTurns: number;
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
    <canvas id="minimap" aria-label="Exploration minimap"></canvas>
    <div class="atmosphere-vignette" aria-hidden="true"></div>
    <section class="run-hud run-hud-left" aria-live="polite">
      <p class="run-label">THE UNDERWORKS</p>
      <p id="health-readout">HEALTH: 36 / 36 | MEDKITS: 2</p>
      <p id="loot-readout">CARRIED: 0 CR | 0 KG</p>
      <p id="stash-readout">BANK: 0 CR</p>
      <p id="keys-readout">KEYRING: EMPTY</p>
      <p id="visibility-readout">LANTERN: LIT | 8M</p>
      <p id="message-readout">The air is still. Move carefully.</p>
      <p id="interaction-readout"></p>
    </section>
    <section class="run-hud run-hud-right" aria-live="polite">
      <p id="turn-readout">TURN 000</p>
      <p id="objective-readout">FIND THE RELIC</p>
      <p id="pressure-readout">DANGER [----------]\nNOISE  [----------]</p>
      <p id="apex-readout">THE DARK IS STILL</p>
      <p id="facility-readout">THE FACILITY HUMS</p>
      <p id="echo-readout">ECHO: SILENT</p>
    </section>
    <section class="run-help">
      <p>W/S MOVE | Q/E TURN | SPACE STRIKE | H HEAVY | G GUARD | D DODGE | I MEDKIT</p>
      <p>Every action draws the dungeon closer.</p>
      <p id="backend-readout"></p>
    </section>
    <section id="upgrade-panel" class="upgrade-panel" hidden aria-label="Upgrade terminal">
      <p class="run-label">FIELD WORKBENCH // NEXT RUN</p>
      <p id="upgrade-balance"></p>
      <div id="upgrade-options"></div>
      <p class="upgrade-close">U / ESC: CLOSE</p>
    </section>`;

  const canvas = requireElement<HTMLCanvasElement>('#stage');
  const minimap = requireElement<HTMLCanvasElement>('#minimap');
  const hud: Hud = {
    turn: requireElement('#turn-readout'),
    objective: requireElement('#objective-readout'),
    loot: requireElement('#loot-readout'),
    stash: requireElement('#stash-readout'),
    keys: requireElement('#keys-readout'),
    health: requireElement('#health-readout'),
    pressure: requireElement('#pressure-readout'),
    echo: requireElement('#echo-readout'),
    facility: requireElement('#facility-readout'),
    apex: requireElement('#apex-readout'),
    visibility: requireElement('#visibility-readout'),
    message: requireElement('#message-readout'),
    interaction: requireElement('#interaction-readout'),
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
  app.dataset.facilityMode = 'normal';
  app.dataset.relicState = 'unsecured';

  const { renderer, backend, reason } = await createRenderer(canvas, {
    maxDevicePixelRatio: 1.75,
    directionalShadows: true,
    hdrScene: true,
    bloom: 0.48,
    bloomThreshold: 0.52,
    outputTransform: 'aces',
    outputExposure: 1.78,
  });
  hud.backend.textContent = `${backend.toUpperCase()} // ${reason}`;
  renderer.resize();
  addEventListener('resize', () => renderer.resize());

  const environment = createEnvironment({
    directionalDir: [0.25, 0.7, -0.3],
    directionalColor: [0.11, 0.15, 0.13],
    ambient: [0.022, 0.03, 0.026],
    ambientGround: [0.008, 0.012, 0.01],
    emissiveGain: 0.65,
    nightFactor: 1,
    fogColor: [0.012, 0.025, 0.02],
    fogDensity: 0.014,
    fogHeightFalloff: 0.04,
    fogBaseY: 0,
  });

  const dungeon = generateDungeon({ width: 20, height: 16, targetRooms: 12, minRoomSize: 4, maxRoomSize: 6 }, RUN_SEED);
  const exploration = new ExplorationMemory(dungeon);
  const dungeonMeshes = buildDungeonMeshes(dungeon);
  const floor = renderer.createMesh(dungeonMeshes.floor);
  const walls = renderer.createMesh(dungeonMeshes.walls);
  const [floorTexture, wallTexture, relicTexture, extractionTexture, documentLootTexture, sampleLootTexture, componentLootTexture, artifactLootTexture, guardMaterialTexture, crawlerMaterialTexture, apexMaterialTexture, equipmentMaterialTexture] = await Promise.all([
    loadSurfaceTexture(renderer, floorTextureUrl),
    loadSurfaceTexture(renderer, wallTextureUrl),
    loadSurfaceTexture(renderer, relicTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, extractionTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, documentLootTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, sampleLootTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, componentLootTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, artifactLootTextureUrl, 'clamp'),
    loadSurfaceTexture(renderer, guardMaterialTextureUrl),
    loadSurfaceTexture(renderer, crawlerMaterialTextureUrl),
    loadSurfaceTexture(renderer, apexMaterialTextureUrl),
    loadSurfaceTexture(renderer, equipmentMaterialTextureUrl),
  ]);
  const relicPosition = pointToWorld(dungeon, dungeon.objective);
  const extractionPosition = pointToWorld(dungeon, dungeon.extraction);
  const startPosition = pointToWorld(dungeon, dungeon.playerStart);
  const lootSpawns = placeRunLoot(dungeon, RUN_SEED, 5);
  const containers = placeRunContainers(dungeon);
  const emergencyPositions = selectEmergencyPositions(dungeon, 7).map((point) => pointToWorld(dungeon, point));
  const relicPedestal = renderer.createMesh(buildRelicPedestal().build());
  const relicCore = renderer.createMesh(buildRelicCore().build());
  const extractionFrame = renderer.createMesh(buildExtractionFrame().build());
  const extractionLocked = renderer.createMesh(buildExtractionSignal([1, 0.08, 0.05]).build());
  const extractionReady = renderer.createMesh(buildExtractionSignal([0.1, 1, 0.45]).build());
  const emergencyLamp = renderer.createMesh(buildEmergencyLamp().build());
  const dungeonDoor = renderer.createMesh(buildDungeonDoor().build());
  const enemyProps = buildEnemyMeshes();
  const containerProps = buildContainerMeshes();
  const containerMeshes = {
    keyLocker: renderer.createMesh(containerProps.keyLocker),
    medCache: renderer.createMesh(containerProps.medCache),
  };
  const enemyMeshes = {
    crawler: renderer.createMesh(enemyProps.crawler),
    guard: renderer.createMesh(enemyProps.guard),
  };
  const apexMesh = renderer.createMesh(buildApexMesh());
  const apexEyes = renderer.createMesh(buildApexEyes().build());
  const objectiveTextures = buildObjectiveTextureMeshes();
  const relicTexturedPedestal = renderer.createMesh(objectiveTextures.relicPedestal);
  const texturedExtractionHatch = renderer.createMesh(objectiveTextures.extractionHatch);
  const lootProps = buildLootPropMeshes();
  const roomProps = buildRoomPropMeshes();
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
  const roomMeshes = Object.fromEntries(Object.entries(roomProps).map(([id, mesh]) => [id, renderer.createMesh(mesh)])) as Record<keyof typeof roomProps, ReturnType<typeof renderer.createMesh>>;
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
  const containerNodes = containers.map((container) => {
    const position = pointToWorld(dungeon, container.point);
    const node = new SceneNode();
    node.setPosition(position.x, 0, position.z);
    return node;
  });
  const roomPropNodes = dungeon.rooms.map((room) => {
    const position = pointToWorld(dungeon, room.center);
    const node = new SceneNode();
    node.setPosition(position.x, 0, position.z);
    return node;
  });
  const doorSystem = new DoorSystem(dungeon.doors);
  const doorNodes = dungeon.doors.map((door) => {
    const position = pointToWorld(dungeon, door.point);
    const node = new SceneNode();
    node.setPosition(
      position.x + door.wallOffset.x * TILE_METRES / 2,
      0,
      position.z + door.wallOffset.y * TILE_METRES / 2,
    );
    node.setRotationAxisAngle(0, 1, 0, door.rotation);
    return node;
  });
  const apexNode = new SceneNode();
  const emergencyNodes = emergencyPositions.map((position) => {
    const node = new SceneNode();
    node.setPosition(position.x, 2.75, position.z);
    return node;
  });

  const camera = new Camera();
  const player: Position = { x: startPosition.x, z: startPosition.z };
  let facing = 1;
  const simulation = new RunSimulation(RUN_SEED);
  const combat = new PlayerCombat(RUN_SEED);
  const audio = new RunAudio();
  const atmosphereModule = loadModule(atmosphereScript as unknown as Record<string, unknown>);
  const atmosphereState = (atmosphereModule.exports.createAlarmState as () => AlarmState)();
  const updateAtmosphere = atmosphereModule.exports.update as (state: AlarmState, hunting: boolean, pressure: number, dt: number) => void;
  const facilityModule = loadModule(facilityDirectorScript as unknown as Record<string, unknown>);
  const facilityState = (facilityModule.exports.createFacilityState as () => FacilityState)();
  const updateFacility = facilityModule.exports.advance as (state: FacilityState, turn: number, pressure: number, noise: number, relicSecured: boolean) => void;
  const relicModule = loadModule(relicProtocolScript as unknown as Record<string, unknown>);
  const relicState = (relicModule.exports.createRelicState as () => RelicState)();
  const secureRelic = relicModule.exports.secure as (state: RelicState) => void;
  const advanceRelic = relicModule.exports.advance as (state: RelicState) => void;
  const apex = new ApexDirector(dungeon);
  const enemies = new EnemyDirector(dungeon, RUN_SEED);
  const enemyNodes = new Map<number, SceneNode>();
  const syncEnemyNodes = (snapshots: readonly EnemySnapshot[]) => {
    for (const enemy of snapshots) {
      let node = enemyNodes.get(enemy.id);
      if (node === undefined) {
        node = new SceneNode();
        enemyNodes.set(enemy.id, node);
      }
      const position = pointToWorld(dungeon, enemy.position);
      node.setPosition(position.x, 0, position.z);
      faceNodeToward(node, position, player);
    }
  };
  syncEnemyNodes(enemies.snapshots());
  let apexVisible = false;
  let apexPosition: Point = dungeon.playerStart;
  let apexMode: ApexMode = 'dormant';
  let facilityMode = 0;
  let hasRelic = false;
  let completed = false;
  let lootValue = 0;
  let lootWeight = 0;
  const collectedLoot = new Set<string>();
  const openedContainers = new Set<string>();
  const keys = new Set<string>();
  let torchOn = true;
  let relicSpin = 0;
  let previousRelicSpin = 0;
  let visualTime = 0;
  const lightBuffer = createPointLightBuffer();
  const minimapContext = minimap.getContext('2d');
  if (minimapContext === null) throw new Error('Minimap canvas is unavailable.');
  const minimapScale = 8;
  minimap.width = dungeon.config.width * minimapScale;
  minimap.height = dungeon.config.height * minimapScale;

  const updateCamera = () => {
    const [dx, dz] = CARDINALS[facing];
    camera.position[0] = player.x;
    camera.position[1] = PLAYER_HEIGHT;
    camera.position[2] = player.z;
    camera.lookAt(player.x + dx * 6, PLAYER_HEIGHT, player.z + dz * 6);
  };

  const updateStash = () => {
    hud.stash.textContent = `BANK: ${progression.credits} CR`;
  };
  const updateCombatHud = () => {
    hud.health.textContent = `HEALTH: ${combat.hp} / ${combat.maxHp} | MEDKITS: ${combat.medkits}`;
  };
  const updateKeysHud = () => {
    hud.keys.textContent = keys.size === 0 ? 'KEYRING: EMPTY' : `KEYRING: ${[...keys].join(' | ')}`;
  };
  const updateDoorPrompt = () => {
    const [dx, dz] = CARDINALS[facing];
    const target = worldToPoint(dungeon, player.x + dx * STEP_METRES, player.z + dz * STEP_METRES);
    const door = doorSystem.getAt(target);
    if (door !== undefined && door.state !== 'open') {
      hud.interaction.textContent = door.state === 'closed'
      ? 'E - OPEN DOOR // +4 NOISE'
      : door.state === 'locked'
        ? keys.has(door.requiredKey ?? '') ? 'E - UNLOCK AMBER DOOR // +4 NOISE' : `LOCKED // REQUIRES ${door.requiredKey ?? 'KEY'}`
        : door.state === 'sealed'
          ? 'SEALED'
          : 'UNMARKED STONE';
      return;
    }
    const container = containers.find((candidate) => !openedContainers.has(candidate.id) && candidate.point.x === worldToPoint(dungeon, player.x, player.z).x && candidate.point.y === worldToPoint(dungeon, player.x, player.z).y);
    hud.interaction.textContent = container === undefined ? '' : `E - OPEN ${container.kind === 'keyLocker' ? 'KEY LOCKER' : 'MEDICAL CACHE'}`;
  };
  const updateExploration = () => {
    const playerPoint = worldToPoint(dungeon, player.x, player.z);
    const radius = Math.max(1, Math.floor((torchOn ? torchSight : 2) / TILE_METRES));
    exploration.update(playerPoint, radius, (point) => doorSystem.isBlocking(point));
    drawMinimap(minimapContext, dungeon, exploration, playerPoint, hasRelic, minimapScale);
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

  const advanceTurn = (action: 'move' | 'turn' | 'blocked' | 'torch' | 'door' | 'attack' | 'heavyAttack' | 'guard' | 'dodge' | 'item', message: string) => {
    const event = simulation.advance(action, message, lootWeight, cargoNoiseReduction);
    audio.playTurn(action);
    advanceRelic(relicState);
    const relicSecured = relicState.secured > 0;
    const previousFacilityMode = facilityMode;
    updateFacility(facilityState, event.turn, event.pressure, event.noiseLevel, relicSecured);
    facilityMode = Math.round(facilityState.mode);
    const pulse = propagateNoise(dungeon, worldToPoint(dungeon, player.x, player.z), event.noise, event.noiseLevel);
    const previousApexMode = apexMode;
    const apexEvent = apex.advance(dungeon, worldToPoint(dungeon, player.x, player.z), pulse, event.pressure, event.turn, torchOn, relicSecured);
    const apexWorld = pointToWorld(dungeon, apexEvent.position);
    apexNode.setPosition(apexWorld.x, 0, apexWorld.z);
    faceNodeToward(apexNode, apexWorld, player);
    apexPosition = apexEvent.position;
    apexVisible = apexEvent.visible;
    apexMode = apexEvent.mode;
    app.dataset.facilityMode = facilityMode === 2 ? 'blackout' : facilityMode === 1 ? 'emergency' : 'normal';
    app.dataset.relicState = relicSecured ? 'secured' : 'unsecured';
    audio.setTension(facilityMode, apexMode === 'hunting', relicSecured);
    if (apexMode === 'hunting' && previousApexMode !== 'hunting') audio.play('apex');
    const enemyEvent = enemies.advance(dungeon, worldToPoint(dungeon, player.x, player.z), pulse, torchOn, (point) => doorSystem.isBlocking(point));
    syncEnemyNodes(enemyEvent.enemies);
    const incomingDamage = enemyEvent.attacks.reduce((total, attack) => total + attack.damage, 0);
    const combatEvent = combat.resolveIncoming(incomingDamage);
    if (combatEvent.damage > 0) audio.play('damage');
    app.dataset.apexMode = apexMode;
    hud.turn.textContent = `TURN ${String(event.turn).padStart(3, '0')}`;
    hud.pressure.textContent = `DANGER ${meter(event.pressure, 100)}\nNOISE  ${meter(event.noiseLevel, 20)}`;
    hud.echo.textContent = pulse.intensity === 0
      ? 'ECHO: FADING'
      : `ECHO: ${pulse.reachedTiles} TILES // RANGE: ${pulse.radiusTiles * STEP_METRES}M`;
    hud.facility.textContent = facilityReadout(facilityMode);
    hud.apex.textContent = apexReadout(apexEvent.mode, relicSecured);
    hud.message.textContent = apexEvent.message ?? (combatEvent.avoided
      ? 'YOU DODGE THE INCOMING STRIKE.'
      : combatEvent.guarded
        ? `GUARD ABSORBS THE BLOW. -${combatEvent.damage} VITALS.`
        : combatEvent.damage > 0
          ? `HOSTILE HIT. -${combatEvent.damage} VITALS.`
          : enemyEvent.message) ?? (facilityMode !== previousFacilityMode
      ? facilityMessage(facilityMode)
      : event.message);
    updateCombatHud();
    if (apexEvent.captured) {
      completed = true;
      hud.objective.textContent = 'RUN LOST // CARGO ABANDONED';
      hud.message.textContent = 'THE APEX FOUND YOU. NOTHING WAS BANKED.';
    } else if (combatEvent.defeated) {
      completed = true;
      hud.objective.textContent = 'RUN LOST // OPERATOR DOWN';
      hud.message.textContent = 'YOUR VITALS FLATLINE. NOTHING WAS BANKED.';
    }
    updateDoorPrompt();
    updateExploration();
  };

  const completeExtraction = () => {
    completed = true;
    progression = bankCredits(progression, lootValue);
    saveProgression(progression);
    hud.stash.textContent = `BANK: ${progression.credits} CR`;
    hud.objective.textContent = 'EXTRACTION COMPLETE';
    hud.message.textContent = `EXTRACTED ${lootValue} CR IN ${simulation.turn} TURNS. Press reload to begin again.`;
    audio.play('extract');
  };

  const act = (key: string) => {
    if (completed) return;

    if (key === 'f') {
      torchOn = !torchOn;
      hud.visibility.textContent = torchOn ? `LANTERN: LIT | ${torchSight}M` : 'LANTERN: DARK | 2M';
      advanceTurn('torch', torchOn ? 'The torch wakes with a dry electrical click.' : 'You kill the torch. The dark closes around you.');
      return;
    }

    if (key === ' ' || key === 'h') {
      const heavy = key === 'h';
      const [dx, dz] = CARDINALS[facing];
      const target = worldToPoint(dungeon, player.x + dx * STEP_METRES, player.z + dz * STEP_METRES);
      const strike = combat.attack(heavy);
      const result = strike.hit ? enemies.damageAt(target, strike.damage) : null;
      const message = !strike.hit
        ? 'HEAVY STRIKE MISSES. THE IMPACT RINGS THROUGH THE FACILITY.'
        : result === null
          ? 'YOUR STRIKE CUTS THROUGH EMPTY AIR.'
          : result.defeated
            ? `${result.kind.toUpperCase()} NEUTRALIZED.`
            : `${result.kind.toUpperCase()} HIT. ${result.remainingHp} VITALS REMAIN.`;
      advanceTurn(heavy ? 'heavyAttack' : 'attack', message);
      return;
    }

    if (key === 'g') {
      combat.guard();
      advanceTurn('guard', 'YOU BRACE FOR THE NEXT IMPACT.');
      return;
    }

    if (key === 'd') {
      combat.dodge();
      const [dx, dz] = CARDINALS[facing];
      const retreat = { x: player.x - dx * STEP_METRES, z: player.z - dz * STEP_METRES };
      if (isWalkable(dungeon, doorSystem, enemies, retreat)) {
        player.x = retreat.x;
        player.z = retreat.z;
        advanceTurn('dodge', 'YOU SLIP BACK AND PREPARE TO DODGE.');
      } else {
        advanceTurn('dodge', 'NO ROOM TO RETREAT. YOU PREPARE TO DODGE.');
      }
      return;
    }

    if (key === 'i') {
      const recovered = combat.useMedkit();
      if (recovered === 0) {
        hud.message.textContent = combat.medkits === 0 ? 'NO MEDKITS REMAIN.' : 'VITALS ALREADY STABLE.';
        return;
      }
      advanceTurn('item', `MEDKIT APPLIED. +${recovered} VITALS.`);
      return;
    }

    if (key === 'x') {
      if (!hasRelic) {
        hud.message.textContent = 'EXTRACTION LOCKED. RECOVER THE RELIC FIRST.';
        audio.play('locked');
      } else if (distance(player, extractionPosition) > EXTRACTION_RANGE) {
        hud.message.textContent = 'MOVE CLOSER TO THE EXTRACTION HATCH.';
      } else {
        completeExtraction();
      }
      return;
    }

    if (key === 'e') {
      const [dx, dz] = CARDINALS[facing];
      const interaction = doorSystem.interact(worldToPoint(dungeon, player.x + dx * STEP_METRES, player.z + dz * STEP_METRES), keys);
      if (interaction !== undefined) {
        if (interaction.opened) advanceTurn('door', interaction.message);
        else {
          hud.message.textContent = interaction.message;
          audio.play('locked');
        }
        updateDoorPrompt();
        return;
      }
      const playerPoint = worldToPoint(dungeon, player.x, player.z);
      const container = containers.find((candidate) => !openedContainers.has(candidate.id) && candidate.point.x === playerPoint.x && candidate.point.y === playerPoint.y);
      if (container !== undefined) {
        openedContainers.add(container.id);
        audio.play('container');
        if (container.kind === 'keyLocker') {
          keys.add(container.key ?? 'AMBER KEYCARD');
          updateKeysHud();
          advanceTurn('item', 'KEY LOCKER OPENED. AMBER KEYCARD SECURED.');
        } else {
          const added = combat.addMedkit();
          updateCombatHud();
          advanceTurn('item', added ? 'MEDICAL CACHE OPENED. +1 MEDKIT.' : 'MEDICAL CACHE OPENED. MEDKIT CAPACITY FULL.');
        }
        updateDoorPrompt();
        return;
      }
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
    if (!isWalkable(dungeon, doorSystem, enemies, next)) {
      const target = worldToPoint(dungeon, next.x, next.z);
      advanceTurn('blocked', enemies.isOccupied(target)
        ? 'A HOSTILE FIGURE BLOCKS THE WAY.'
        : 'The way is sealed. The sound of your attempt travels farther than it should.');
      return;
    }

    player.x = next.x;
    player.z = next.z;
    const recoveredRelic = !hasRelic && distance(player, relicPosition) < 1.2;
    if (recoveredRelic) {
      hasRelic = true;
      secureRelic(relicState);
      hud.objective.textContent = 'OBJECTIVE: RETURN TO EXTRACTION // SIGNAL ACTIVE';
      app.dataset.relicState = 'secured';
      audio.play('relic');
    }
    if (hasRelic && distance(player, extractionPosition) <= EXTRACTION_RANGE) {
      completeExtraction();
      return;
    }
    advanceTurn('move', recoveredRelic ? 'RELIC SECURED. THE FACILITY DROPS INTO BLACKOUT.' : 'Your footsteps fade into the ventilation hum.');
    if (completed) return;

    const recoveredLoot = lootSpawns.find((loot) =>
      !collectedLoot.has(loot.id) && distance(player, pointToWorld(dungeon, loot.point)) < 1.2,
    );
    if (recoveredLoot !== undefined) {
      if (lootWeight + recoveredLoot.weight > carryCapacity) {
        hud.message.textContent = `LOAD LIMIT ${carryCapacity} KG. LEAVE ${recoveredLoot.name.toUpperCase()} OR RETURN LIGHTER.`;
        return;
      }
      collectedLoot.add(recoveredLoot.id);
      lootValue += recoveredLoot.value;
      lootWeight += recoveredLoot.weight;
      audio.play('loot');
      hud.loot.textContent = `CARRIED: ${lootValue} CR | ${lootWeight} / ${carryCapacity} KG`;
      hud.message.textContent = `SECURED: ${recoveredLoot.name.toUpperCase()} // +${recoveredLoot.value} CR // HEAVIER STEPS`;
    }

    if (recoveredRelic) updateExploration();
  };

  addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'u' || key === 'escape') {
      if (key === 'u' || upgradePanelOpen) toggleUpgradePanel();
      return;
    }
    if (upgradePanelOpen) return;
    const mapped = key === 'arrowup' ? 'w' : key === 'arrowdown' ? 's' : key === 'arrowleft' ? 'q' : key === 'arrowright' ? 'e' : key;
    if (mapped === 'w' || mapped === 's' || mapped === 'q' || mapped === 'e' || mapped === 'f' || mapped === 'x' || mapped === ' ' || mapped === 'h' || mapped === 'g' || mapped === 'd' || mapped === 'i') {
      event.preventDefault();
      audio.unlock();
      act(mapped);
    }
  });

  updateCamera();
  updateCombatHud();
  updateKeysHud();
  updateDoorPrompt();
  updateExploration();
  startLoop({
    simulate(dt) {
      previousRelicSpin = relicSpin;
      relicSpin += dt * 1.4;
      visualTime += dt;
      updateAtmosphere(atmosphereState, apexMode === 'hunting', simulation.pressure, dt);
    },
    render(alpha) {
      const interpolatedSpin = previousRelicSpin + (relicSpin - previousRelicSpin) * alpha;
      relicNode.setRotationAxisAngle(0, 1, 0, interpolatedSpin);
      relicPedestalNode.updateWorld();
      relicNode.updateWorld();
      extractionNode.updateWorld();
      for (const node of lootNodes) node.updateWorld();
      for (const node of containerNodes) node.updateWorld();
      for (const node of roomPropNodes) node.updateWorld();
      for (const node of doorNodes) node.updateWorld();
      apexNode.updateWorld();
      for (const node of enemyNodes.values()) node.updateWorld();
      for (const node of emergencyNodes) node.updateWorld();
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
            flicker: 0.18,
            shadowNear: 0.15,
            sourceRadius: 0.08,
          }]
        : [];
      if (!hasRelic && exploration.isVisible(dungeon.objective)) {
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
      const alertPulse = 0.36 + atmosphereState.level * (0.34 + Math.sin(visualTime * 8) * 0.3);
      const facilityLight = facilityMode === 2 ? 0.08 : facilityMode === 1 ? 0.68 : 1;
      for (const position of emergencyPositions) {
        lights.push({
          x: position.x,
          y: 2.65,
          z: position.z,
          r: (0.42 + atmosphereState.level * alertPulse) * facilityLight,
          g: (0.06 - atmosphereState.level * 0.04) * facilityLight,
          b: (0.045 - atmosphereState.level * 0.03) * facilityLight,
          radius: (3.1 + atmosphereState.level * 1.3) * facilityLight,
          flicker: 0.22 + atmosphereState.level * 0.43,
          shadowNear: 0.1,
          sourceRadius: 0.04,
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
      environment.fogDensity = 0.014 + Math.min(0.007, simulation.pressure * 0.00007) + atmosphereState.level * 0.003 + (facilityMode === 2 ? 0.004 : 0);
      const hunting = apexMode === 'hunting';
      if (facilityMode === 2) {
        environment.fogColor[0] = 0.003;
        environment.fogColor[1] = 0.008;
        environment.fogColor[2] = 0.007;
      } else if (hunting) {
        environment.fogColor[0] = 0.035;
        environment.fogColor[1] = 0.009;
        environment.fogColor[2] = 0.005;
      } else if (facilityMode === 1) {
        environment.fogColor[0] = 0.028;
        environment.fogColor[1] = 0.011;
        environment.fogColor[2] = 0.006;
      } else {
        environment.fogColor[0] = 0.012;
        environment.fogColor[1] = 0.025;
        environment.fogColor[2] = 0.02;
      }

      renderer.beginFrame(hunting ? [0.012, 0.002, 0.001] : facilityMode === 2 ? [0.001, 0.003, 0.002] : facilityMode === 1 ? [0.009, 0.003, 0.001] : [0.004, 0.009, 0.007]);
      renderer.bindMeshPass(camera, environment);
      renderer.setSurfaceTexture(floorTexture, 1.4, 1.4);
      renderer.drawMesh(floor, identity.worldMatrix);
      renderer.setSurfaceTexture(wallTexture, 1, 1.8);
      renderer.drawMesh(walls, identity.worldMatrix);
      renderer.setSurfaceTexture(null);
      for (let index = 0; index < dungeon.rooms.length; index += 1) {
        const room = dungeon.rooms[index];
        if (!exploration.isVisible(room.center)) continue;
        renderer.drawMesh(roomMeshes[room.archetype], roomPropNodes[index].worldMatrix);
      }
      for (let index = 0; index < dungeon.doors.length; index += 1) {
        if (!doorSystem.isBlocking(dungeon.doors[index].point) || !exploration.isVisible(dungeon.doors[index].point)) continue;
        renderer.drawMesh(dungeonDoor, doorNodes[index].worldMatrix);
      }
      for (const node of emergencyNodes) renderer.drawMesh(emergencyLamp, node.worldMatrix);
      if (!hasRelic && exploration.isVisible(dungeon.objective)) {
        renderer.drawMesh(relicPedestal, relicPedestalNode.worldMatrix);
        renderer.setSurfaceTexture(relicTexture);
        renderer.drawMesh(relicTexturedPedestal, relicPedestalNode.worldMatrix);
        renderer.setSurfaceTexture(null);
        renderer.drawMesh(relicCore, relicNode.worldMatrix);
      }
      for (let index = 0; index < lootSpawns.length; index += 1) {
        const loot = lootSpawns[index];
        if (!collectedLoot.has(loot.id) && exploration.isVisible(loot.point)) {
          renderer.setSurfaceTexture(lootTextures[loot.kind]);
          renderer.drawMesh(lootMeshes[loot.kind], lootNodes[index].worldMatrix);
        }
      }
      renderer.setSurfaceTexture(equipmentMaterialTexture, 1, 1);
      for (let index = 0; index < containers.length; index += 1) {
        const container = containers[index];
        if (!openedContainers.has(container.id) && exploration.isVisible(container.point)) renderer.drawMesh(containerMeshes[container.kind], containerNodes[index].worldMatrix);
      }
      renderer.setSurfaceTexture(apexMaterialTexture, 1, 1);
      if (apexVisible && exploration.isVisible(apexPosition)) {
        renderer.drawMesh(apexMesh, apexNode.worldMatrix);
        renderer.setSurfaceTexture(null);
        renderer.drawMesh(apexEyes, apexNode.worldMatrix);
      }
      for (const enemy of enemies.snapshots()) {
        if (!exploration.isVisible(enemy.position)) continue;
        const node = enemyNodes.get(enemy.id);
        if (node !== undefined) {
          renderer.setSurfaceTexture(enemy.kind === 'crawler' ? crawlerMaterialTexture : guardMaterialTexture, 1, 1);
          renderer.drawMesh(enemyMeshes[enemy.kind], node.worldMatrix);
        }
      }
      if (exploration.isVisible(dungeon.extraction)) {
        renderer.setSurfaceTexture(null);
        renderer.drawMesh(extractionFrame, extractionNode.worldMatrix);
        renderer.setSurfaceTexture(extractionTexture);
        renderer.drawMesh(texturedExtractionHatch, extractionNode.worldMatrix);
        renderer.setSurfaceTexture(null);
        renderer.drawMesh(hasRelic ? extractionReady : extractionLocked, extractionNode.worldMatrix);
      }
      renderer.setSurfaceTexture(null);
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

function buildApexEyes(): MeshBuilder {
  const mesh = new MeshBuilder();
  mesh.addSphere([-0.075, 1.61, 0.14], 0.035, [1, 0.04, 0.01], 1, 8, 5);
  mesh.addSphere([0.075, 1.61, 0.14], 0.035, [1, 0.04, 0.01], 1, 8, 5);
  return mesh;
}

function faceNodeToward(node: SceneNode, origin: Position, target: Position): void {
  node.setRotationAxisAngle(0, 1, 0, Math.atan2(target.x - origin.x, target.z - origin.z));
}

function buildEmergencyLamp(): MeshBuilder {
  const mesh = new MeshBuilder();
  mesh.addCylinder([0, 0, 0], 0.13, 0.08, 'y', [0.045, 0.055, 0.05], 0, 10, 0.35);
  mesh.addSphere([0, -0.11, 0], 0.09, [0.95, 0.08, 0.025], 1, 8, 5);
  mesh.addBox([0, 0.12, 0], [0.05, 0.08, 0.05], [0.08, 0.1, 0.09], 0, 0.25);
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

function isWalkable(dungeon: ReturnType<typeof generateDungeon>, doors: DoorSystem, enemies: EnemyDirector, position: Position): boolean {
  const point = worldToPoint(dungeon, position.x, position.z);
  return dungeon.tiles[point.y]?.[point.x] !== undefined && dungeon.tiles[point.y][point.x] !== 'wall' && !doors.isBlocking(point) && !enemies.isOccupied(point);
}

function selectEmergencyPositions(dungeon: ReturnType<typeof generateDungeon>, count: number): Array<{ x: number; y: number }> {
  const candidates: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < dungeon.tiles.length; y += 1) {
    for (let x = 0; x < dungeon.tiles[y].length; x += 1) {
      if (dungeon.tiles[y][x] === 'wall') continue;
      if ((x * 11 + y * 7 + RUN_SEED) % 9 === 0) candidates.push({ x, y });
    }
  }
  return candidates.slice(0, count);
}

function facilityLabel(mode: number): string {
  return mode === 2 ? 'BLACKOUT' : mode === 1 ? 'EMERGENCY' : 'NORMAL';
}

function facilityReadout(mode: number): string {
  return mode === 2 ? 'THE LIGHTS DIE' : mode === 1 ? 'RED LIGHTS FLICKER' : 'THE FACILITY HUMS';
}

function apexReadout(mode: ApexMode, relicSecured: boolean): string {
  if (mode === 'hunting') return 'YOU ARE BEING HUNTED';
  if (mode === 'searching') return relicSecured ? 'SOMETHING FOLLOWS THE SIGNAL' : 'SOMETHING IS LOOKING';
  return 'THE DARK IS STILL';
}

function meter(value: number, maximum: number): string {
  const slots = 10;
  const filled = Math.max(0, Math.min(slots, Math.ceil(value / maximum * slots)));
  return `[${'#'.repeat(filled)}${'-'.repeat(slots - filled)}]`;
}

function facilityMessage(mode: number): string {
  if (mode === 2) {
    return 'FACILITY BLACKOUT. YOUR TORCH IS THE ONLY RELIABLE LIGHT.';
  }

  if (mode === 1) {
    return 'EMERGENCY CIRCUIT ACTIVE. RED LIGHTS STUTTER DOWN THE HALL.';
  }

  return 'AUXILIARY POWER RETURNS. THE HUM NEVER STOPS.';
}

function drawMinimap(
  context: CanvasRenderingContext2D,
  dungeon: DungeonData,
  exploration: ExplorationMemory,
  player: Point,
  hasRelic: boolean,
  scale: number,
): void {
  context.fillStyle = '#030806';
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  for (let y = 0; y < dungeon.config.height; y += 1) {
    for (let x = 0; x < dungeon.config.width; x += 1) {
      const state = exploration.get({ x, y });
      if (state === 'unknown') continue;
      const wall = dungeon.tiles[y][x] === 'wall';
      context.fillStyle = state === 'visible'
        ? wall ? '#68746c' : '#9ab6a3'
        : wall ? '#1a2921' : '#294236';
      context.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  if (!hasRelic && exploration.isExplored(dungeon.objective)) {
    drawMinimapMarker(context, dungeon.objective, scale, '#48e5c0');
  }
  if (exploration.isExplored(dungeon.extraction)) {
    drawMinimapMarker(context, dungeon.extraction, scale, '#e8b45d');
  }
  drawMinimapMarker(context, player, scale, '#ffffff');
}

function drawMinimapMarker(context: CanvasRenderingContext2D, point: Point, scale: number, color: string): void {
  context.fillStyle = color;
  context.fillRect(point.x * scale + 1, point.y * scale + 1, Math.max(2, scale - 2), Math.max(2, scale - 2));
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
