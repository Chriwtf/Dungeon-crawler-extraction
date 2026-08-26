import { createPose, sampleClip, Skeleton } from '@driftengine/animation';
import { gltfToMeshes, readGlb, readGltfSkins } from '@driftengine/assets';
import type { RendererApi } from '@driftengine/core';
import type { EnemyKind } from '../game/core/EnemyDirector';
import guardUrl from '../assets/models/characters/guard-rigged.glb?url';
import crawlerUrl from '../assets/models/characters/crawler-rigged.glb?url';
import apexUrl from '../assets/models/characters/apex-rigged.glb?url';

export type RiggedAsset = { readonly meshes: ReturnType<RendererApi['createMesh']>[]; readonly skeleton: Skeleton; readonly pose: ReturnType<typeof createPose>; readonly clip: ReturnType<typeof readGltfSkins>['clips'][number]; readonly duration: number };

/** Game-side GLB bridge: DriftEngine owns GLB parsing, skinning and clip sampling. */
export async function loadRiggedEnemyAssets(renderer: RendererApi): Promise<Record<EnemyKind | 'apex', RiggedAsset | null>> {
  const [guard, crawler, apex] = await Promise.all([loadRigged(renderer, guardUrl), loadRigged(renderer, crawlerUrl), loadRigged(renderer, apexUrl)]);
  return { guard, crawler, apex };
}

export function animateRig(asset: RiggedAsset, time: number): void {
  sampleClip(asset.clip, time % asset.duration, asset.pose);
  asset.skeleton.applyPose(asset.pose);
}

async function loadRigged(renderer: RendererApi, url: string): Promise<RiggedAsset | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const { json, binary } = readGlb(await response.arrayBuffer());
    if (binary === null) return null;
    const animated = readGltfSkins(json, [binary]);
    const skin = animated.skins[0];
    const clip = animated.clips[0];
    if (skin === undefined || clip === undefined) return null;
    const imported = gltfToMeshes(json, [binary]);
    const duration = Math.max(0.01, clip.durationSec);
    return { meshes: imported.meshes.map((mesh) => renderer.createMesh(mesh)), skeleton: new Skeleton(skin.joints, skin.inverseBind), pose: createPose(skin.joints.length), clip, duration };
  } catch {
    return null;
  }
}
