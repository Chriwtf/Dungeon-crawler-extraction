import { MeshBuilder } from '@driftengine/core';
import type { MeshData } from '@driftengine/core';
import type { ContainerKind } from '../game/core/RunContainers';

export type ContainerMeshes = Record<ContainerKind, MeshData>;

/** Small, recognisable utility props built through DriftEngine's mesh API. */
export function buildContainerMeshes(): ContainerMeshes {
  const locker = new MeshBuilder();
  locker.addBox([0, 0.42, 0], [0.46, 0.42, 0.28], [0.12, 0.18, 0.16], 0.2);
  locker.addBox([0, 0.47, 0.29], [0.3, 0.22, 0.025], [0.28, 0.38, 0.32], 0.42, 0.35);
  locker.addBox([0, 0.56, 0.325], [0.06, 0.08, 0.02], [1, 0.55, 0.08], 1, 0.2);

  const cache = new MeshBuilder();
  cache.addBox([0, 0.22, 0], [0.54, 0.22, 0.34], [0.16, 0.22, 0.18], 0.18);
  cache.addBox([0, 0.49, 0], [0.5, 0.06, 0.3], [0.28, 0.38, 0.32], 0.48, 0.32);
  cache.addBox([0, 0.53, 0.31], [0.15, 0.035, 0.018], [0.95, 0.16, 0.12], 1, 0.2);
  return { keyLocker: locker.build(), medCache: cache.build() };
}
