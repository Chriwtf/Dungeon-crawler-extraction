import { createPose, sampleClip, Skeleton } from '@driftengine/animation';
import { gltfToMeshes, readGlb, readGltfSkins } from '@driftengine/assets';
import guardUrl from '../assets/models/characters/guard-rigged.glb?url';
import crawlerUrl from '../assets/models/characters/crawler-rigged.glb?url';
import apexUrl from '../assets/models/characters/apex-rigged.glb?url';
/** Game-side GLB bridge: DriftEngine owns GLB parsing, skinning and clip sampling. */
export async function loadRiggedEnemyAssets(renderer) {
    const [guard, crawler, apex] = await Promise.all([loadRigged(renderer, guardUrl), loadRigged(renderer, crawlerUrl), loadRigged(renderer, apexUrl)]);
    return { guard, crawler, apex };
}
export function animateRig(asset, time) {
    sampleClip(asset.clip, time % asset.duration, asset.pose);
    asset.skeleton.applyPose(asset.pose);
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
