import {
  cloneItem,
  hydrateItem,
  serializeItem,
  type Item,
  type StoredItem,
} from '../items/inventory';

const STORAGE_KEY = 'dungeon-crawler-extraction-meta';
const LOADOUT_SIZE = 4;

type PersistedMetaState = {
  stash: StoredItem[];
  loadout: Array<StoredItem | null>;
};

export type MetaState = {
  stash: Item[];
  loadout: Array<Item | null>;
};

const createEmptyState = (): MetaState => ({
  stash: [],
  loadout: Array(LOADOUT_SIZE).fill(null),
});

const normalizeLoadout = (loadout?: Array<StoredItem | null>): Array<Item | null> => {
  const normalized = Array(LOADOUT_SIZE).fill(null) as Array<Item | null>;

  if (!loadout) {
    return normalized;
  }

  for (let index = 0; index < Math.min(loadout.length, LOADOUT_SIZE); index += 1) {
    normalized[index] = loadout[index] ? hydrateItem(loadout[index] as StoredItem) : null;
  }

  return normalized;
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadMetaState = (): MetaState => {
  if (!canUseStorage()) {
    return createEmptyState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyState();
    }

    const parsed = JSON.parse(raw) as Partial<PersistedMetaState>;
    return {
      stash: Array.isArray(parsed.stash) ? parsed.stash.map(hydrateItem) : [],
      loadout: Array.isArray(parsed.loadout) ? normalizeLoadout(parsed.loadout) : Array(LOADOUT_SIZE).fill(null),
    };
  } catch {
    return createEmptyState();
  }
};

const saveMetaState = (state: MetaState): void => {
  if (!canUseStorage()) {
    return;
  }

  const payload: PersistedMetaState = {
    stash: state.stash.map(serializeItem),
    loadout: state.loadout.map((item) => (item ? serializeItem(item) : null)),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const getMetaState = (): MetaState => loadMetaState();

export const equipLoadoutItem = (stashIndex: number, slotIndex: number): MetaState => {
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

export const unequipLoadoutItem = (slotIndex: number): MetaState => {
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

export const depositInventoryToStash = (inventory: Array<Item | null>): MetaState => {
  const state = loadMetaState();
  const depositedItems = inventory.filter((item): item is Item => item !== null).map(cloneItem);
  const nextState = {
    stash: [...state.stash, ...depositedItems],
    loadout: Array(LOADOUT_SIZE).fill(null),
  };

  saveMetaState(nextState);
  return nextState;
};

export const consumeLoadoutForRun = (): Array<Item | null> => {
  const state = loadMetaState();
  const runInventory = state.loadout.map((item) => (item ? cloneItem(item) : null));
  const nextState = {
    stash: [...state.stash],
    loadout: Array(LOADOUT_SIZE).fill(null),
  };

  saveMetaState(nextState);
  return runInventory;
};

export const clearMetaState = (): void => {
  saveMetaState(createEmptyState());
};
