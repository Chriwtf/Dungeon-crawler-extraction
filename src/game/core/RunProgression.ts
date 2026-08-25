export type UpgradeKey = 'torch' | 'dampeners' | 'rig';

export type RunProgression = {
  readonly credits: number;
  readonly upgrades: Record<UpgradeKey, number>;
};

export const UPGRADE_DEFINITIONS: Record<UpgradeKey, { readonly label: string; readonly description: string; readonly costs: readonly number[] }> = {
  torch: { label: 'TORCH ARRAY', description: '+2m torch sight per level', costs: [400, 800] },
  dampeners: { label: 'DAMPENERS', description: '-1 cargo noise per step per level', costs: [350, 700] },
  rig: { label: 'UTILITY RIG', description: '+4kg carrying capacity per level', costs: [450, 900] },
};

const STORAGE_KEY = 'dungeon-extraction-progression-v1';
const LEGACY_CREDITS_KEY = 'dungeon-extraction-stash-credits';

export function loadProgression(): RunProgression {
  const fallbackCredits = Number.parseInt(localStorage.getItem(LEGACY_CREDITS_KEY) ?? '0', 10) || 0;
  const fallback: RunProgression = { credits: Math.max(0, fallbackCredits), upgrades: { torch: 0, dampeners: 0, rig: 0 } };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<RunProgression>;
    return {
      credits: typeof parsed.credits === 'number' && parsed.credits >= 0 ? Math.floor(parsed.credits) : fallback.credits,
      upgrades: {
        torch: sanitizeLevel(parsed.upgrades?.torch),
        dampeners: sanitizeLevel(parsed.upgrades?.dampeners),
        rig: sanitizeLevel(parsed.upgrades?.rig),
      },
    };
  } catch {
    return fallback;
  }
}

export function saveProgression(progression: RunProgression): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
}

export function bankCredits(progression: RunProgression, credits: number): RunProgression {
  return { ...progression, credits: progression.credits + Math.max(0, Math.floor(credits)) };
}

export function buyUpgrade(progression: RunProgression, key: UpgradeKey): RunProgression | null {
  const level = progression.upgrades[key];
  const cost = UPGRADE_DEFINITIONS[key].costs[level];
  if (cost === undefined || progression.credits < cost) return null;
  return {
    credits: progression.credits - cost,
    upgrades: { ...progression.upgrades, [key]: level + 1 },
  };
}

export function getTorchSight(progression: RunProgression): number {
  return 8 + progression.upgrades.torch * 2;
}

export function getCargoNoiseReduction(progression: RunProgression): number {
  return progression.upgrades.dampeners;
}

export function getCarryCapacity(progression: RunProgression): number {
  return 6 + progression.upgrades.rig * 4;
}

function sanitizeLevel(value: unknown): number {
  return typeof value === 'number' ? Math.max(0, Math.min(2, Math.floor(value))) : 0;
}
