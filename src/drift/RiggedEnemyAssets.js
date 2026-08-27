import { AnimationStateMachine, BlendTree, createPose, Skeleton } from '@driftengine/animation';
import { gltfToMeshes, readGlb, readGltfSkins } from '@driftengine/assets';
import { SceneNode } from '@driftengine/core';
import guardUrl from '../assets/models/characters/guard-rigged.glb?url';
import crawlerUrl from '../assets/models/characters/crawler-rigged.glb?url';
import apexUrl from '../assets/models/characters/apex-rigged.glb?url';
const RIGGED_MODEL_TRANSFORMS = {
    guard: { scale: 3, floorOffset: 0.96 },
    crawler: { scale: 3, floorOffset: 0.96 },
    apex: { scale: 3.6, floorOffset: 1.15 },
};
/** Game-side GLB bridge: DriftEngine owns GLB parsing, skinning and clip sampling. */
export async function loadRiggedEnemyAssets(renderer) {
    const [guard, crawler, apex] = await Promise.all([loadRigged(renderer, guardUrl), loadRigged(renderer, crawlerUrl), loadRigged(renderer, apexUrl)]);
    return { guard, crawler, apex };
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
 * Gobkit characters are authored Z-up; place them under the gameplay node so
 * its Y-axis facing remains independent from the model-space correction.
 */
export function createRiggedEnemyNode(kind) {
    const transform = RIGGED_MODEL_TRANSFORMS[kind];
    const node = new SceneNode();
    node.setPosition(0, transform.floorOffset, 0);
    node.setRotationAxisAngle(1, 0, 0, -Math.PI / 2);
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
        const clip = animated.clips[0];
        if (skin === undefined || clip === undefined)
            return null;
        const imported = gltfToMeshes(json, [binary]);
        const rootMotionJoint = skin.joints.findIndex((joint) => joint.name.toLowerCase() === 'hips');
        const clips = {
            idle: clipSegment(clip, 0, 1.25, 'idle'),
            // The source pack has no dedicated walk clip, so its calm loop is the explicit fallback.
            move: clipSegment(clip, 0, 1.25, 'move-fallback'),
            attack: clipSegment(clip, 1.25, 2.5, 'attack'),
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
function clipSegment(source, start, end, name) {
    const safeEnd = Math.min(Math.max(start + 0.01, end), source.durationSec);
    return {
        name,
        durationSec: safeEnd - start,
        tracks: source.tracks.map((track) => {
            const width = track.path === 'rotation' ? 4 : 3;
            const keys = [];
            for (let index = 0; index < track.times.length; index += 1) {
                const time = track.times[index] ?? 0;
                if (time >= start && time <= safeEnd)
                    keys.push(index);
            }
            if (keys.length === 0)
                keys.push(0);
            const times = new Float32Array(keys.length);
            const values = new Float32Array(keys.length * width);
            for (let index = 0; index < keys.length; index += 1) {
                const key = keys[index] ?? 0;
                times[index] = (track.times[key] ?? start) - start;
                values.set(track.values.subarray(key * width, key * width + width), index * width);
            }
            return { joint: track.joint, path: track.path, times, values };
        }),
    };
}
