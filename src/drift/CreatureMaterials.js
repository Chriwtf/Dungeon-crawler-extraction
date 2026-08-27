import guardAlbedoUrl from '../assets/textures/guard-material-albedo.png?url';
import crawlerAlbedoUrl from '../assets/textures/crawler-material-albedo.png?url';
import apexAlbedoUrl from '../assets/textures/apex-material-albedo.png?url';
const PROFILES = {
    guard: { roughness: 0.46, metallic: 0.78, normalStrength: 0.55 },
    crawler: { roughness: 0.88, metallic: 0.03, normalStrength: 0.32 },
    apex: { roughness: 0.68, metallic: 0.2, normalStrength: 0.48 },
};
const ALBEDO_URLS = { guard: guardAlbedoUrl, crawler: crawlerAlbedoUrl, apex: apexAlbedoUrl };
/** Game-owned PBR assembly. The renderer receives standard material slots only. */
export async function loadCreatureMaterials(renderer) {
    const entries = await Promise.all(Object.keys(ALBEDO_URLS).map(async (kind) => {
        const bitmap = await loadBitmap(ALBEDO_URLS[kind]);
        const profile = PROFILES[kind];
        return [kind, {
                albedo: renderer.createSurfaceTexture(bitmap, { anisotropy: 4, colorSpace: 'srgb', wrap: 'repeat' }),
                normal: renderer.createSurfaceTexture(createNormalMap(bitmap, profile.normalStrength), { anisotropy: 4, colorSpace: 'linear', wrap: 'repeat' }),
                orm: renderer.createSurfaceTexture(createOrmMap(bitmap, profile), { anisotropy: 4, colorSpace: 'linear', wrap: 'repeat' }),
                normalStrength: profile.normalStrength,
            }];
    }));
    return Object.fromEntries(entries);
}
async function loadBitmap(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Could not load creature material: ${url}`);
    return createImageBitmap(await response.blob());
}
function materialCanvas(bitmap) {
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null)
        throw new Error('2D canvas is unavailable for creature material processing.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
}
function createNormalMap(bitmap, strength) {
    const canvas = materialCanvas(bitmap);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null)
        throw new Error('2D canvas is unavailable for normal-map processing.');
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const source = image.data.slice();
    const sample = (x, y) => {
        const px = (x + canvas.width) % canvas.width;
        const py = (y + canvas.height) % canvas.height;
        const at = (py * canvas.width + px) * 4;
        return ((source[at] ?? 0) * 0.2126 + (source[at + 1] ?? 0) * 0.7152 + (source[at + 2] ?? 0) * 0.0722) / 255;
    };
    for (let y = 0; y < canvas.height; y += 1)
        for (let x = 0; x < canvas.width; x += 1) {
            const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
            const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
            const length = Math.hypot(dx, dy, 1);
            const at = (y * canvas.width + x) * 4;
            image.data[at] = Math.round((dx / length * 0.5 + 0.5) * 255);
            image.data[at + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
            image.data[at + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
            image.data[at + 3] = 255;
        }
    context.putImageData(image, 0, 0);
    return canvas;
}
function createOrmMap(bitmap, profile) {
    const canvas = materialCanvas(bitmap);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null)
        throw new Error('2D canvas is unavailable for ORM-map processing.');
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let at = 0; at < image.data.length; at += 4) {
        const luminance = ((image.data[at] ?? 0) * 0.2126 + (image.data[at + 1] ?? 0) * 0.7152 + (image.data[at + 2] ?? 0) * 0.0722) / 255;
        image.data[at] = Math.round((0.72 + luminance * 0.28) * 255);
        image.data[at + 1] = Math.round(Math.min(1, profile.roughness * (0.82 + luminance * 0.18)) * 255);
        image.data[at + 2] = Math.round(Math.min(1, profile.metallic * (0.75 + luminance * 0.25)) * 255);
        image.data[at + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas;
}
