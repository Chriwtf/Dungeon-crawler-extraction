import type { RendererApi, SurfaceMaterial } from '@driftengine/core';

type MaterialHandle = ReturnType<RendererApi['createSurfaceTexture']>;
export type PbrMaterial = SurfaceMaterial<MaterialHandle>;

/**
 * Asset naming convention: `<material>_basecolor`, `<material>_normal`,
 * `<material>_orm`, and optional `<material>_emissive`. The URLs remain game-owned.
 */
export interface PbrTextureSet {
  readonly baseColorUrl: string;
  readonly normalUrl?: string;
  readonly ormUrl?: string;
  readonly emissiveUrl?: string;
}

export interface PbrMaterialOptions {
  readonly roughness: number;
  readonly metallic: number;
  readonly normalStrength: number;
  readonly uScale?: number;
  readonly vScale?: number;
  readonly wrap?: 'clamp' | 'repeat';
}

/**
 * Game-side PBR bridge. Existing authored albedos get consistent normal and ORM inputs
 * until dedicated texture sets replace them in the following material-content steps.
 */
export async function createPbrMaterial(
  renderer: RendererApi,
  textures: PbrTextureSet,
  options: PbrMaterialOptions,
): Promise<PbrMaterial> {
  const bitmap = await loadBitmap(textures.baseColorUrl);
  const [normal, orm, emissive] = await Promise.all([
    textures.normalUrl === undefined ? createNormalMap(bitmap, options.normalStrength) : loadBitmap(textures.normalUrl),
    textures.ormUrl === undefined ? createOrmMap(bitmap, options) : loadBitmap(textures.ormUrl),
    textures.emissiveUrl === undefined ? null : loadBitmap(textures.emissiveUrl),
  ]);
  const textureOptions = { anisotropy: 4, wrap: options.wrap ?? 'repeat' } as const;
  return {
    albedo: renderer.createSurfaceTexture(bitmap, { ...textureOptions, colorSpace: 'srgb' }),
    normal: renderer.createSurfaceTexture(normal, { ...textureOptions, colorSpace: 'linear' }),
    orm: renderer.createSurfaceTexture(orm, { ...textureOptions, colorSpace: 'linear' }),
    emissive: emissive === null ? null : renderer.createSurfaceTexture(emissive, { ...textureOptions, colorSpace: 'srgb' }),
    normalStrength: options.normalStrength,
    uScale: options.uScale,
    vScale: options.vScale,
  };
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load PBR albedo: ${url}`);
  return createImageBitmap(await response.blob());
}

function materialCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) throw new Error('2D canvas is unavailable for PBR material processing.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function createNormalMap(bitmap: ImageBitmap, strength: number): HTMLCanvasElement {
  const canvas = materialCanvas(bitmap);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) throw new Error('2D canvas is unavailable for normal-map processing.');
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const source = image.data.slice();
  const sample = (x: number, y: number) => {
    const px = (x + canvas.width) % canvas.width;
    const py = (y + canvas.height) % canvas.height;
    const at = (py * canvas.width + px) * 4;
    return ((source[at] ?? 0) * 0.2126 + (source[at + 1] ?? 0) * 0.7152 + (source[at + 2] ?? 0) * 0.0722) / 255;
  };
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
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

function createOrmMap(bitmap: ImageBitmap, options: PbrMaterialOptions): HTMLCanvasElement {
  const canvas = materialCanvas(bitmap);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) throw new Error('2D canvas is unavailable for ORM-map processing.');
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let at = 0; at < image.data.length; at += 4) {
    const luminance = ((image.data[at] ?? 0) * 0.2126 + (image.data[at + 1] ?? 0) * 0.7152 + (image.data[at + 2] ?? 0) * 0.0722) / 255;
    image.data[at] = Math.round((0.72 + luminance * 0.28) * 255);
    image.data[at + 1] = Math.round(Math.min(1, options.roughness * (0.82 + luminance * 0.18)) * 255);
    image.data[at + 2] = Math.round(Math.min(1, options.metallic * (0.75 + luminance * 0.25)) * 255);
    image.data[at + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
