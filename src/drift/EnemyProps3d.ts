import { MeshBuilder } from '@driftengine/core';
import type { MeshData } from '@driftengine/core';
import type { EnemyKind } from '../game/core/EnemyDirector';

export function buildEnemyMeshes(): Record<EnemyKind, MeshData> {
  const crawler = new MeshBuilder();
  crawler.addSphere([0, 0.34, 0], 0.34, [0.18, 0.22, 0.14], 0.08, 10, 6);
  crawler.addSphere([0, 0.42, 0.27], 0.18, [0.25, 0.31, 0.18], 0.1, 8, 5);
  for (const x of [-0.28, 0.28]) {
    crawler.addBox([x, 0.2, -0.1], [0.05, 0.12, 0.33], [0.14, 0.18, 0.09], 0.1);
    crawler.addBox([x, 0.18, 0.2], [0.05, 0.1, 0.28], [0.14, 0.18, 0.09], 0.1);
  }
  crawler.addSphere([-0.07, 0.47, 0.4], 0.035, [0.95, 0.18, 0.03], 1, 6, 4);
  crawler.addSphere([0.07, 0.47, 0.4], 0.035, [0.95, 0.18, 0.03], 1, 6, 4);

  const guard = new MeshBuilder();
  guard.addCylinder([0, 0.82, 0], 0.28, 1.35, 'y', [0.16, 0.2, 0.19], 0.08, 10, 0.2);
  guard.addBox([0, 0.96, 0.18], [0.38, 0.42, 0.08], [0.12, 0.16, 0.15], 0.12, 0.18);
  guard.addSphere([0, 1.58, 0], 0.25, [0.14, 0.18, 0.16], 0.06, 10, 6);
  guard.addSphere([0, 1.6, 0.22], 0.045, [0.9, 0.56, 0.08], 0.8, 8, 5);
  guard.addBox([0.38, 0.78, 0], [0.06, 0.48, 0.06], [0.1, 0.13, 0.11], 0.1, 0.2);

  // These hybrid meshes mix curved and hard-surface primitives. A full planar pass keeps
  // every plate and limb textured instead of leaving later primitives at UV origin.
  return { crawler: crawler.build({ planarUvs: true }), guard: guard.build({ planarUvs: true }) };
}
