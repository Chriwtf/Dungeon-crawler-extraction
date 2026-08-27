import { AnimationStateMachine, BlendTree, createPose, Skeleton } from '@driftengine/animation';
import { gltfToMeshes, readGlb, readGltfSkins } from '@driftengine/assets';
import { SceneNode } from '@driftengine/core';
import humanoidUrl from '../assets/models/characters/quaternius-human-rigged.glb?url';
const RIGGED_MODEL_TRANSFORMS = {
    guard: { scale: 21.5, floorOffset: 0.01 },
    crawler: { scale: 17, floorOffset: 0.01 },
    apex: { scale: 27, floorOffset: 0.01 },
};
/** Game-side GLB bridge: DriftEngine owns GLB parsing, skinning and clip sampling. */
export async function loadRiggedEnemyAssets(renderer) {
    const humanoid = await loadRigged(renderer, humanoidUrl);
    return { guard: humanoid, crawler: humanoid, apex: humanoid };
}
export function createRiggedAnimator(asset) {
    const jointCount = asset.joints.length;
    const machine = new AnimationStateMachine([
        { name: 'idle', tree: new BlendTree({ kind: 'clip', clip: asset.clips.idle }, jointCount) },
        { name: 'move', tree: new BlendTree({ kind: 'clip', clip: asset.clips.move }, jointCount) },
        { name: 'attack', tree: new BlendTree({ kind: 'clip', clip: asset.clips.attack }, jointCount) },
    ], [
        { from: 'idle', to: 'attack', durationSec: 0.12, when: (p) => p.attack > 0 },
        { from: 'idle', to: 'move', durationSec: 0.18, when: (p) => p.move > 0 },
        { from: 'move', to: 'attack', durationSec: 0.1, when: (p) => p.attack > 0 },
        { from: 'move', to: 'idle', durationSec: 0.18, when: (p) => p.move <= 0 },
        { from: 'attack', to: 'move', durationSec: 0.14, when: (p) => p.attack <= 0 && p.move > 0 },
        { from: 'attack', to: 'idle', durationSec: 0.14, when: (p) => p.attack <= 0 && p.move <= 0 },
    ], jointCount);
    return { skeletons: asset.inverseBinds.map((inverseBind) => new Skeleton(asset.joints, inverseBind)), pose: createPose(jointCount), machine, rootMotionJoint: asset.rootMotionJoint };
}
export function animateRig(animator, state, dt) {
    animator.machine.set('move', state === 'move' ? 1 : 0);
    animator.machine.set('attack', state === 'attack' ? 1 : 0);
    animator.machine.advance(dt);
    animator.machine.evaluate(animator.pose);
    if (animator.rootMotionJoint >= 0) {
        // Gameplay owns world movement; discard the clip's locomotion before skinning.
        animator.pose.translation.fill(0, animator.rootMotionJoint * 3, animator.rootMotionJoint * 3 + 3);
    }
    for (const skeleton of animator.skeletons)
        skeleton.applyPose(animator.pose);
}
/**
 * The humanoid GLB is Y-up and faces forward in local space. Keep its scale
 * under the gameplay node so AI-facing remains independent from presentation.
 */
export function createRiggedEnemyNode(kind) {
    const transform = RIGGED_MODEL_TRANSFORMS[kind];
    const node = new SceneNode();
    node.setPosition(0, transform.floorOffset, 0);
    node.setScale(transform.scale, transform.scale, transform.scale);
    return node;
}
async function loadRigged(renderer, url) {
    try {
        const response = await fetch(url);
        if (!response.ok)
            return null;
        const { json, binary } = readGlb(await response.arrayBuffer());
        if (binary === null)
            return null;
        const animated = readGltfSkins(json, [binary]);
        const skin = animated.skins[0];
        if (skin === undefined)
            return null;
        const imported = gltfToMeshes(json, [binary]);
        const rootMotionJoint = skin.joints.findIndex((joint) => joint.name.toLowerCase().includes('hips'));
        const clips = {
            idle: findClip(animated.clips, 'idle'),
            move: findClip(animated.clips, 'walk'),
            attack: findClip(animated.clips, 'punch'),
        };
        const skinIndices = (json.nodes ?? []).flatMap((node) => {
            if (node.mesh === undefined)
                return [];
            const primitiveCount = (json.meshes ?? [])[node.mesh]?.primitives.length ?? 0;
            return Array.from({ length: primitiveCount }, () => node.skin ?? 0);
        });
        return {
            parts: imported.meshes.map((mesh, index) => ({ mesh: renderer.createMesh(mesh), skinIndex: skinIndices[index] ?? 0 })),
            joints: skin.joints,
            inverseBinds: animated.skins.map((entry) => entry.inverseBind),
            clips,
            rootMotionJoint,
        };
    }
    catch {
        return null;
    }
}
function findClip(clips, name) {
    const clip = clips.find((candidate) => candidate.name.toLowerCase().includes(name));
    if (clip === undefined)
        throw new Error(`Humanoid GLB is missing its ${name} animation.`);
    return clip;
}
