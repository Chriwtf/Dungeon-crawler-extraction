import { mkdirSync, writeFileSync } from 'node:fs';

const output = new URL('../src/assets/models/', import.meta.url);
mkdirSync(output, { recursive: true });

const vertices = [];
const uvs = [];
const faces = [];

function quad(points, material, u = 1, v = 1) {
  const vertexStart = vertices.length + 1;
  const uvStart = uvs.length + 1;
  vertices.push(...points);
  uvs.push([0, 0], [u, 0], [u, v], [0, v]);
  faces.push(`usemtl ${material}`);
  faces.push(`f ${vertexStart}/${uvStart} ${vertexStart + 1}/${uvStart + 1} ${vertexStart + 2}/${uvStart + 2}`);
  faces.push(`f ${vertexStart}/${uvStart} ${vertexStart + 2}/${uvStart + 2} ${vertexStart + 3}/${uvStart + 3}`);
}

function box(cx, cy, cz, hx, hy, hz, material) {
  const x0 = cx - hx;
  const x1 = cx + hx;
  const y0 = cy - hy;
  const y1 = cy + hy;
  const z0 = cz - hz;
  const z1 = cz + hz;
  quad([[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], material, hx, hz);
  quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], material, hx, hz);
  quad([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], material, hx, hy);
  quad([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], material, hz, hy);
  quad([[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], material, hx, hy);
  quad([[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], material, hz, hy);
}

function roomWalls(x, z, halfWidth, halfDepth, doorway) {
  box(x, 1.8, z - halfDepth, halfWidth, 1.8, 0.18, 'wall');
  box(x, 1.8, z + halfDepth, halfWidth, 1.8, 0.18, 'wall');
  const closedX = doorway === 'east' ? x - halfWidth : x + halfWidth;
  box(closedX, 1.8, z, 0.18, 1.8, halfDepth, 'wall');
  const openX = doorway === 'east' ? x + halfWidth : x - halfWidth;
  const segment = (halfDepth - 1.5) / 2;
  const offset = (halfDepth + 1.5) / 2;
  box(openX, 1.8, z - offset, 0.18, 1.8, segment, 'wall');
  box(openX, 1.8, z + offset, 0.18, 1.8, segment, 'wall');
}

box(0, -0.2, 0, 6, 0.2, 5, 'floor');
box(11, -0.2, 0, 5, 0.2, 1.5, 'floor');
box(23, -0.2, 0, 7, 0.2, 6, 'floor');
roomWalls(0, 0, 6, 5, 'east');
roomWalls(23, 0, 7, 6, 'west');
box(11, 1.8, -1.5, 5, 1.8, 0.18, 'wall');
box(11, 1.8, 1.5, 5, 1.8, 0.18, 'wall');

const obj = [
  'mtllib textured-environment.mtl',
  'o TexturedExtractionSlice',
  ...vertices.map((vertex) => `v ${vertex.join(' ')}`),
  ...uvs.map((uv) => `vt ${uv.join(' ')}`),
  ...faces,
  '',
].join('\n');

const mtl = [
  'newmtl floor',
  'Kd 1 1 1',
  'map_Kd ../textures/industrial-floor-albedo.png',
  '',
  'newmtl wall',
  'Kd 1 1 1',
  'map_Kd ../textures/industrial-wall-albedo.png',
  '',
].join('\n');

writeFileSync(new URL('textured-environment.obj', output), obj);
writeFileSync(new URL('textured-environment.mtl', output), mtl);
