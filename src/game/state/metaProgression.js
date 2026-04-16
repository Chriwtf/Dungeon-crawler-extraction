import { cloneItem, hydrateItem, serializeItem, } from '../items/inventory';
const STORAGE_KEY = 'dungeon-crawler-extraction-meta';
const LOADOUT_SIZE = 4;
const createEmptyState = () => ({
    stash: [],
    loadout: Array(LOADOUT_SIZE).fill(null),
});
const normalizeLoadout = (loadout) => {
    const normalized = Array(LOADOUT_SIZE).fill(null);
    if (!loadout) {
        return normalized;
    }
    for (let index = 0; index < Math.min(loadout.length, LOADOUT_SIZE); index += 1) {
        normalized[index] = loadout[index] ? hydrateItem(loadout[index]) : null;
    }
    return normalized;
};
const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
export const loadMetaState = () => {
    if (!canUseStorage()) {
        return createEmptyState();
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return createEmptyState();
        }
        const parsed = JSON.parse(raw);
        return {
            stash: Array.isArray(parsed.stash) ? parsed.stash.map(hydrateItem) : [],
            loadout: Array.isArray(parsed.loadout) ? normalizeLoadout(parsed.loadout) : Array(LOADOUT_SIZE).fill(null),
        };
    }
    catch {
        return createEmptyState();
    }
};
const saveMetaState = (state) => {
    if (!canUseStorage()) {
        return;
    }
    const payload = {
        stash: state.stash.map(serializeItem),
        loadout: state.loadout.map((item) => (item ? serializeItem(item) : null)),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};
export const getMetaState = () => loadMetaState();
export const equipLoadoutItem = (stashIndex, slotIndex) => {
    const state = loadMetaState();
    const stashItem = state.stash[stashIndex];
    if (!stashItem || slotIndex < 0 || slotIndex >= LOADOUT_SIZE) {
        return state;
    }
    const nextStash = [...state.stash];
    const [equippedItem] = nextStash.splice(stashIndex, 1);
    const nextLoadout = [...state.loadout];
    const replacedItem = nextLoadout[slotIndex];
    nextLoadout[slotIndex] = equippedItem;
    if (replacedItem) {
        nextStash.push(replacedItem);
    }
    const nextState = { stash: nextStash, loadout: nextLoadout };
    saveMetaState(nextState);
    return nextState;
};
export const unequipLoadoutItem = (slotIndex) => {
    const state = loadMetaState();
    const loadoutItem = state.loadout[slotIndex];
    if (!loadoutItem) {
        return state;
    }
    const nextLoadout = [...state.loadout];
    nextLoadout[slotIndex] = null;
    const nextState = {
        stash: [...state.stash, loadoutItem],
        loadout: nextLoadout,
    };
    saveMetaState(nextState);
    return nextState;
};
export const depositInventoryToStash = (inventory) => {
    const state = loadMetaState();
    const depositedItems = inventory.filter((item) => item !== null).map(cloneItem);
    const nextState = {
        stash: [...state.stash, ...depositedItems],
        loadout: Array(LOADOUT_SIZE).fill(null),
    };
    saveMetaState(nextState);
    return nextState;
};
export const consumeLoadoutForRun = () => {
    const state = loadMetaState();
    const runInventory = state.loadout.map((item) => (item ? cloneItem(item) : null));
    const nextState = {
        stash: [...state.stash],
        loadout: Array(LOADOUT_SIZE).fill(null),
    };
    saveMetaState(nextState);
    return runInventory;
};
export const clearMetaState = () => {
    saveMetaState(createEmptyState());
};
