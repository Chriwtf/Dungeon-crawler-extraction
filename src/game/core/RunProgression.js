export const UPGRADE_DEFINITIONS = {
    torch: { label: 'TORCH ARRAY', description: '+2m torch sight per level', costs: [350, 750] },
    dampeners: { label: 'DAMPENERS', description: '-1 cargo noise per step per level', costs: [300, 650] },
    rig: { label: 'UTILITY RIG', description: '+4kg carrying capacity per level', costs: [400, 850] },
};
const STORAGE_KEY = 'dungeon-extraction-progression-v1';
const LEGACY_CREDITS_KEY = 'dungeon-extraction-stash-credits';
export function loadProgression() {
    const fallbackCredits = Number.parseInt(localStorage.getItem(LEGACY_CREDITS_KEY) ?? '0', 10) || 0;
    const fallback = { credits: Math.max(0, fallbackCredits), upgrades: { torch: 0, dampeners: 0, rig: 0 } };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null)
        return fallback;
    try {
        const parsed = JSON.parse(raw);
        return {
            credits: typeof parsed.credits === 'number' && parsed.credits >= 0 ? Math.floor(parsed.credits) : fallback.credits,
            upgrades: {
                torch: sanitizeLevel(parsed.upgrades?.torch),
                dampeners: sanitizeLevel(parsed.upgrades?.dampeners),
                rig: sanitizeLevel(parsed.upgrades?.rig),
            },
        };
    }
    catch {
        return fallback;
    }
}
export function saveProgression(progression) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
}
export function bankCredits(progression, credits) {
    return { ...progression, credits: progression.credits + Math.max(0, Math.floor(credits)) };
}
export function buyUpgrade(progression, key) {
    const level = progression.upgrades[key];
    const cost = UPGRADE_DEFINITIONS[key].costs[level];
    if (cost === undefined || progression.credits < cost)
        return null;
    return {
        credits: progression.credits - cost,
        upgrades: { ...progression.upgrades, [key]: level + 1 },
    };
}
export function getTorchSight(progression) {
    return 8 + progression.upgrades.torch * 2;
}
export function getCargoNoiseReduction(progression) {
    return progression.upgrades.dampeners;
}
export function getCarryCapacity(progression) {
    return 6 + progression.upgrades.rig * 4;
}
function sanitizeLevel(value) {
    return typeof value === 'number' ? Math.max(0, Math.min(2, Math.floor(value))) : 0;
}
