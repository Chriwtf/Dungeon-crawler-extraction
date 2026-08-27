import guardAlbedoUrl from '../assets/textures/guard-material-albedo.png?url';
import crawlerAlbedoUrl from '../assets/textures/crawler-material-albedo.png?url';
import apexAlbedoUrl from '../assets/textures/apex-material-albedo.png?url';
import { createPbrMaterial } from './PbrMaterialPipeline';
const PROFILES = {
    guard: { roughness: 0.46, metallic: 0.78, normalStrength: 0.55 },
    crawler: { roughness: 0.88, metallic: 0.03, normalStrength: 0.32 },
    apex: { roughness: 0.68, metallic: 0.2, normalStrength: 0.48 },
};
const ALBEDO_URLS = { guard: guardAlbedoUrl, crawler: crawlerAlbedoUrl, apex: apexAlbedoUrl };
/** Game-owned PBR assembly. The renderer receives standard material slots only. */
export async function loadCreatureMaterials(renderer) {
    const entries = await Promise.all(Object.keys(ALBEDO_URLS).map(async (kind) => {
        return [kind, await createPbrMaterial(renderer, ALBEDO_URLS[kind], PROFILES[kind])];
    }));
    return Object.fromEntries(entries);
}
