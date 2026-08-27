import { AnimationStateMachine, BlendTree, createPose, Skeleton, type AnimationClip } from '@driftengine/animation';
import { gltfToMeshes, readGlb, readGltfSkins } from '@driftengine/assets';
import { SceneNode, type RendererApi } from '@driftengine/core';
import type { EnemyKind } from '../game/core/EnemyDirector';
import humanoidUrl from '../assets/models/characters/quaternius-human-rigged.glb?url';

export type RiggedAsset = { readonly parts: readonly { readonly mesh: ReturnType<RendererApi['createMesh']>; readonly skinIndex: number }[]; readonly joints: ReturnType<typeof readGltfSkins>['skins'][number]['joints']; readonly inverseBinds: readonly Float32Array[]; readonly bindPose: ReturnType<typeof createPose>; readonly clips: CreatureClips; readonly rootMotionJoint: number };
export type RiggedAnimator = { readonly skeletons: readonly Skeleton[]; readonly pose: ReturnType<typeof createPose>; readonly machine: AnimationStateMachine; readonly rootMotionJoint: number; readonly rootBindTranslation: Float32Array };
type CreatureClips = { readonly idle: AnimationClip; readonly move: AnimationClip; readonly attack: AnimationClip };
export type CreatureAnimationState = 'idle' | 'move' | 'attack';

const RIGGED_MODEL_TRANSFORMS: Record<EnemyKind | 'apex', { readonly scale: number; readonly floorOffset: number }> = {
  guard: { scale: 0.31, floorOffset: 0.01 },
  crawler: { scale: 0.25, floorOffset: 0.01 },
  apex: { scale: 0.39, floorOffset: 0.01 },
};

/** Game-side GLB bridge: DriftEngine owns GLB parsing, skinning and clip sampling. */
export async function loadRiggedEnemyAssets(renderer: RendererApi): Promise<Record<EnemyKind | 'apex', RiggedAsset | null>> {
  const humanoid = await loadRigged(renderer, humanoidUrl);
  return { guard: humanoid, crawler: humanoid, apex: humanoid };
}

export function createRiggedAnimator(asset: RiggedAsset): RiggedAnimator {
  const jointCount = asset.joints.length;
  const machine = new AnimationStateMachine(
    [
      { name: 'idle', tree: new BlendTree({ kind: 'clip', clip: asset.clips.idle }, jointCount, asset.bindPose) },
      { name: 'move', tree: new BlendTree({ kind: 'clip', clip: asset.clips.move }, jointCount, asset.bindPose) },
      { name: 'attack', tree: new BlendTree({ kind: 'clip', clip: asset.clips.attack }, jointCount, asset.bindPose) },
    ],
    [
      { from: 'idle', to: 'attack', durationSec: 0.12, when: (p) => p.attack > 0 },
      { from: 'idle', to: 'move', durationSec: 0.18, when: (p) => p.move > 0 },
      { from: 'move', to: 'attack', durationSec: 0.1, when: (p) => p.attack > 0 },
      { from: 'move', to: 'idle', durationSec: 0.18, when: (p) => p.move <= 0 },
      { from: 'attack', to: 'move', durationSec: 0.14, when: (p) => p.attack <= 0 && p.move > 0 },
      { from: 'attack', to: 'idle', durationSec: 0.14, when: (p) => p.attack <= 0 && p.move <= 0 },
    ],
    jointCount,
    asset.bindPose,
  );
  const pose = createPose(jointCount);
  pose.translation.set(asset.bindPose.translation);
  pose.rotation.set(asset.bindPose.rotation);
  pose.scale.set(asset.bindPose.scale);
  const rootAt = Math.max(0, asset.rootMotionJoint) * 3;
  return {
    skeletons: asset.inverseBinds.map((inverseBind) => new Skeleton(asset.joints, inverseBind)),
    pose,
    machine,
    rootMotionJoint: asset.rootMotionJoint,
    rootBindTranslation: asset.bindPose.translation.slice(rootAt, rootAt + 3),
  };
}

export function animateRig(animator: RiggedAnimator, state: CreatureAnimationState, dt: number): void {
  animator.machine.set('move', state === 'move' ? 1 : 0);
  animator.machine.set('attack', state === 'attack' ? 1 : 0);
  animator.machine.advance(dt);
  animator.machine.evaluate(animator.pose);
  if (animator.rootMotionJoint >= 0) {
    // Gameplay owns world movement; retain bind placement but discard clip locomotion.
    animator.pose.translation.set(animator.rootBindTranslation, animator.rootMotionJoint * 3);
  }
  for (const skeleton of animator.skeletons) skeleton.applyPose(animator.pose);
}

/**
 * The humanoid GLB is Y-up and faces forward in local space. Keep its scale
 * under the gameplay node so AI-facing remains independent from presentation.
 */
export function createRiggedEnemyNode(kind: EnemyKind | 'apex'): SceneNode {
  const transform = RIGGED_MODEL_TRANSFORMS[kind];
  const node = new SceneNode();
  node.setPosition(0, transform.floorOffset, 0);
  node.setScale(transform.scale, transform.scale, transform.scale);
  return node;
}

async function loadRigged(renderer: RendererApi, url: string): Promise<RiggedAsset | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const { json, binary } = readGlb(await response.arrayBuffer());
    if (binary === null) return null;
    const animated = readGltfSkins(json, [binary]);
    const skin = animated.skins[0];
    if (skin === undefined) return null;
    const imported = gltfToMeshes(json, [binary]);
    const rootMotionJoint = skin.joints.findIndex((joint) => joint.name.toLowerCase().includes('hips'));
    const bindPose = readBindPose(json, skin.joints);
    const clips = {
      idle: findClip(animated.clips, 'idle'),
      move: findClip(animated.clips, 'walk'),
      attack: findClip(animated.clips, 'punch'),
    };
    const skinIndices = (json.nodes ?? []).flatMap((node) => {
      if (node.mesh === undefined) return [];
      const primitiveCount = (json.meshes ?? [])[node.mesh]?.primitives.length ?? 0;
      return Array.from({ length: primitiveCount }, () => node.skin ?? 0);
    });
    return {
      parts: imported.meshes.map((mesh, index) => ({ mesh: renderer.createMesh(mesh), skinIndex: skinIndices[index] ?? 0 })),
      joints: skin.joints,
      inverseBinds: animated.skins.map((entry) => entry.inverseBind),
      bindPose,
      clips,
      rootMotionJoint,
    };
  } catch {
    return null;
  }
}

function findClip(clips: readonly AnimationClip[], name: string): AnimationClip {
  const clip = clips.find((candidate) => candidate.name.toLowerCase().includes(name));
  if (clip === undefined) throw new Error(`Humanoid GLB is missing its ${name} animation.`);
  return clip;
}

function readBindPose(json: ReturnType<typeof readGlb>['json'], joints: RiggedAsset['joints']): ReturnType<typeof createPose> {
  const pose = createPose(joints.length);
  const nodes = json.nodes ?? [];
  const nodeByName = new Map(nodes.map((node, index) => [node.name ?? `joint ${index}`, { node, index }]));
  for (let index = 0; index < joints.length; index += 1) {
    const joint = joints[index];
    if (joint === undefined) continue;
    const entry = nodeByName.get(joint.name);
    if (entry === undefined) continue;
    const at3 = index * 3;
    const at4 = index * 4;
    pose.translation.set(entry.node.translation ?? [0, 0, 0], at3);
    pose.rotation.set(entry.node.rotation ?? [0, 0, 0, 1], at4);
    pose.scale.set(entry.node.scale ?? [1, 1, 1], at3);
    if (joint.parent < 0) {
      const parent = nodes.find((node) => node.children?.includes(entry.index));
      if (parent !== undefined) {
        const parentScale = parent.scale ?? [1, 1, 1];
        pose.translation[at3] = (pose.translation[at3] ?? 0) * (parentScale[0] ?? 1);
        pose.translation[at3 + 1] = (pose.translation[at3 + 1] ?? 0) * (parentScale[1] ?? 1);
        pose.translation[at3 + 2] = (pose.translation[at3 + 2] ?? 0) * (parentScale[2] ?? 1);
        pose.scale[at3] = (pose.scale[at3] ?? 1) * (parentScale[0] ?? 1);
        pose.scale[at3 + 1] = (pose.scale[at3 + 1] ?? 1) * (parentScale[1] ?? 1);
        pose.scale[at3 + 2] = (pose.scale[at3 + 2] ?? 1) * (parentScale[2] ?? 1);
      }
    }
  }
  return pose;
}
