import { createPose, sampleClip, Skeleton } from '@driftengine/animation';
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
export function animateRig(asset, time) {
    sampleClip(asset.clip, time % asset.duration, asset.pose);
    asset.skeleton.applyPose(asset.pose);
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
        const duration = Math.max(0.01, clip.durationSec);
        return { meshes: imported.meshes.map((mesh) => renderer.createMesh(mesh)), skeleton: new Skeleton(skin.joints, skin.inverseBind), pose: createPose(skin.joints.length), clip, duration };
    }
    catch {
        return null;
    }
}
