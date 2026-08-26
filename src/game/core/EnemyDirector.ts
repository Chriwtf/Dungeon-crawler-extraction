import { World, defineComponent } from '@driftengine/entities';
import { loadModule } from 'driftscript';
import type { DungeonData, Point } from '../world/DungeonGenerator';
import { hasLineOfSight, findStepToward, manhattanDistance, samePoint } from '../world/DungeonPathfinding';
import { ROOM_ARCHETYPES } from '../world/RoomArchetypes';
import { isNoiseAudibleAt, type NoisePulse } from './NoiseSystem';
import * as enemyBrainScript from '../../drift/scripts/EnemyBrain.drs';

export type EnemyKind = 'crawler' | 'guard';
export type EnemyState = 'idle' | 'investigate' | 'chase' | 'attack' | 'return';

export type EnemySnapshot = {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly state: EnemyState;
  readonly position: Point;
  readonly hp: number;
  readonly maxHp: number;
  readonly damage: number;
  readonly perceptionRange: number;
  readonly hearingRange: number;
  readonly speed: number;
  readonly lootTable: string;
};

export type EnemyEvent = {
  readonly enemies: readonly EnemySnapshot[];
  readonly attacks: readonly EnemyAttack[];
  readonly message: string | null;
};

export type EnemyAttack = { readonly id: number; readonly kind: EnemyKind; readonly damage: number };
export type EnemyDamageResult = { readonly kind: EnemyKind; readonly remainingHp: number; readonly defeated: boolean };

interface EnemyMind { state: number; }

const Position = defineComponent('EnemyPosition', { x: 'i32', y: 'i32', homeX: 'i32', homeY: 'i32' });
const Stats = defineComponent('EnemyStats', {
  kind: 'u8', hp: 'i32', maxHp: 'i32', damage: 'i32', speed: 'u8', perception: 'u8', hearing: 'u8', loot: 'u8',
});
const State = defineComponent('EnemyState', { value: 'u8', targetX: 'i32', targetY: 'i32' });

const DEFINITIONS: Readonly<Record<EnemyKind, Omit<EnemySnapshot, 'id' | 'state' | 'position'>>> = {
  crawler: { kind: 'crawler', hp: 24, maxHp: 24, damage: 7, speed: 2, perceptionRange: 4, hearingRange: 8, lootTable: 'crawler remains' },
  guard: { kind: 'guard', hp: 52, maxHp: 52, damage: 12, speed: 1, perceptionRange: 5, hearingRange: 4, lootTable: 'guard equipment' },
};

/** DriftEngine ECS world for local enemies; pathfinding remains deterministic game-side. */
export class EnemyDirector {
  private readonly world = new World();
  private readonly minds = new Map<number, EnemyMind>();
  private readonly module = loadModule(enemyBrainScript as unknown as Record<string, unknown>);
  private readonly createMind = this.module.exports.createEnemyMind as () => EnemyMind;
  private readonly advanceMind = this.module.exports.advance as (mind: EnemyMind, distance: number, canSee: boolean, heard: boolean, atTarget: boolean, homeDistance: number) => void;

  constructor(dungeon: DungeonData, seed: number) {
    const random = createSeededRandom(seed ^ 0x9e3779b9);
    const spawned = new Set<EnemyKind>();
    for (const room of dungeon.rooms) {
      const profile = ROOM_ARCHETYPES[room.archetype].enemyProfile;
      const kind = profile === 'crawler' ? 'crawler' : profile === 'guard' ? 'guard' : undefined;
      if (kind === undefined || samePoint(room.center, dungeon.playerStart) || random() > ROOM_ARCHETYPES[room.archetype].enemyChance) continue;
      this.spawn(kind, room.center);
      spawned.add(kind);
    }

    // The current vertical slice is small; guarantee both authored enemy types are testable.
    const fallbackRooms = dungeon.rooms.filter((room) =>
      room.archetype !== 'reliquary' && room.archetype !== 'extractionRoom' && !samePoint(room.center, dungeon.playerStart),
    );
    const requiredKinds: readonly EnemyKind[] = ['crawler', 'guard'];
    for (let index = 0; index < requiredKinds.length; index += 1) {
      const kind = requiredKinds[index];
      if (spawned.has(kind)) continue;
      const room = fallbackRooms[index % fallbackRooms.length];
      if (room !== undefined) this.spawn(kind, room.center);
    }
  }

  advance(dungeon: DungeonData, player: Point, pulse: NoisePulse, torchOn: boolean, isBlocked: (point: Point) => boolean): EnemyEvent {
    let message: string | null = null;
    const attacks: EnemyAttack[] = [];
    for (const entity of this.world.query(Position, Stats, State)) {
      const position = readPosition(this.world, entity);
      const stats = readStats(this.world, entity);
      const mind = this.minds.get(entity);
      if (mind === undefined) continue;
      const distance = manhattanDistance(position, player);
      const canSee = torchOn && distance <= stats.perceptionRange && hasLineOfSight(dungeon, position, player);
      const heard = pulse.intensity > 0 && manhattanDistance(position, pulse.origin) <= stats.hearingRange && isNoiseAudibleAt(pulse, position);
      const state = stateFromValue(Number(this.world.read(entity, State, 'value')));
      const target = { x: Number(this.world.read(entity, State, 'targetX')), y: Number(this.world.read(entity, State, 'targetY')) };
      this.advanceMind(mind, distance, canSee, heard, samePoint(position, target), manhattanDistance(position, { x: Number(this.world.read(entity, Position, 'homeX')), y: Number(this.world.read(entity, Position, 'homeY')) }));
      const nextState = stateFromValue(Math.round(mind.state));
      this.world.write(entity, State, 'value', stateValue(nextState));

      if (nextState === 'investigate' && heard) this.setTarget(entity, pulse.origin);
      if (nextState === 'chase') this.setTarget(entity, player);
      if (nextState === 'return') this.setTarget(entity, { x: Number(this.world.read(entity, Position, 'homeX')), y: Number(this.world.read(entity, Position, 'homeY')) });
      if (nextState === 'attack') {
        attacks.push({ id: entity, kind: stats.kind, damage: stats.damage });
        message ??= stats.kind === 'crawler' ? 'A CRAWLER SKITTERS INTO STRIKING RANGE.' : 'A GUARD BLOCKS THE CORRIDOR.';
        continue;
      }

      if (nextState !== 'idle') this.move(entity, dungeon, player, isBlocked, stats.speed);
      if (state !== nextState && nextState === 'chase') message ??= stats.kind === 'crawler' ? 'A CRAWLER HEARS YOU.' : 'A GUARD TURNS TOWARD THE LIGHT.';
    }
    return { enemies: this.snapshots(), attacks, message };
  }

  damageAt(point: Point, damage: number): EnemyDamageResult | null {
    for (const entity of this.world.query(Position, Stats, State)) {
      if (!samePoint(readPosition(this.world, entity), point)) continue;
      const stats = readStats(this.world, entity);
      const remainingHp = Math.max(0, stats.hp - Math.max(0, Math.floor(damage)));
      this.world.write(entity, Stats, 'hp', remainingHp);
      if (remainingHp === 0) {
        this.minds.delete(entity);
        this.world.destroy(entity);
      }
      return { kind: stats.kind, remainingHp, defeated: remainingHp === 0 };
    }
    return null;
  }

  isOccupied(point: Point): boolean {
    return this.snapshots().some((enemy) => samePoint(enemy.position, point));
  }

  snapshots(): readonly EnemySnapshot[] {
    const snapshots: EnemySnapshot[] = [];
    for (const entity of this.world.query(Position, Stats, State)) {
      const stats = readStats(this.world, entity);
      snapshots.push({
        id: entity,
        kind: stats.kind,
        state: stateFromValue(Number(this.world.read(entity, State, 'value'))),
        position: readPosition(this.world, entity),
        hp: stats.hp,
        maxHp: stats.maxHp,
        damage: stats.damage,
        speed: stats.speed,
        perceptionRange: stats.perceptionRange,
        hearingRange: stats.hearingRange,
        lootTable: stats.lootTable,
      });
    }
    return snapshots;
  }

  private spawn(kind: EnemyKind, point: Point): void {
    const definition = DEFINITIONS[kind];
    const entity = this.world.create();
    this.world.add(entity, Position, { x: point.x, y: point.y, homeX: point.x, homeY: point.y });
    this.world.add(entity, Stats, { kind: kind === 'crawler' ? 0 : 1, hp: definition.hp, maxHp: definition.maxHp, damage: definition.damage, speed: definition.speed, perception: definition.perceptionRange, hearing: definition.hearingRange, loot: kind === 'crawler' ? 0 : 1 });
    this.world.add(entity, State, { value: 0, targetX: point.x, targetY: point.y });
    this.minds.set(entity, this.createMind());
  }

  private setTarget(entity: number, target: Point): void {
    this.world.write(entity, State, 'targetX', target.x);
    this.world.write(entity, State, 'targetY', target.y);
  }

  private move(entity: number, dungeon: DungeonData, player: Point, isBlocked: (point: Point) => boolean, speed: number): void {
    for (let step = 0; step < speed; step += 1) {
      const position = readPosition(this.world, entity);
      const target = { x: Number(this.world.read(entity, State, 'targetX')), y: Number(this.world.read(entity, State, 'targetY')) };
      if (samePoint(position, target) || manhattanDistance(position, player) <= 1) return;
      const next = findStepToward(dungeon, position, target, (point) => isBlocked(point) || this.isOccupiedByOther(point, entity));
      if (samePoint(next, position) || samePoint(next, player)) return;
      this.world.write(entity, Position, 'x', next.x);
      this.world.write(entity, Position, 'y', next.y);
    }
  }

  private isOccupiedByOther(point: Point, entity: number): boolean {
    return this.snapshots().some((enemy) => enemy.id !== entity && samePoint(enemy.position, point));
  }
}

function readPosition(world: World, entity: number): Point {
  return { x: Number(world.read(entity, Position, 'x')), y: Number(world.read(entity, Position, 'y')) };
}

function readStats(world: World, entity: number): Omit<EnemySnapshot, 'id' | 'state' | 'position'> {
  const kind = Number(world.read(entity, Stats, 'kind')) === 0 ? 'crawler' : 'guard';
  return { ...DEFINITIONS[kind], hp: Number(world.read(entity, Stats, 'hp')), maxHp: Number(world.read(entity, Stats, 'maxHp')), damage: Number(world.read(entity, Stats, 'damage')) };
}

function stateValue(state: EnemyState): number { return ['idle', 'investigate', 'chase', 'attack', 'return'].indexOf(state); }
function stateFromValue(value: number): EnemyState { return (['idle', 'investigate', 'chase', 'attack', 'return'] as const)[value] ?? 'idle'; }
function createSeededRandom(seed: number): () => number { let state = seed >>> 0 || 0x9e3779b9; return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x1_0000_0000; }; }
