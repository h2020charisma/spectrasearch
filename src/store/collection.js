import { create } from "zustand";

// A persistent "collection" (clipboard/cart) of search results the user compiles
// across searches, kept in localStorage. Visualised on demand at /collection and
// opened together in a viewer.
const KEY = "qb_collection";

export const itemKey = (it) => `${it?.type}:${it?.id}`;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / serialization errors */
  }
}

// keep only the fields the viewers/UI need
function pick(it) {
  return {
    id: it.id,
    type: it.type,
    text: it.text,
    value: it.value ?? null,
    imageLink: it.imageLink ?? null,
  };
}

export const useCollection = create((set, get) => ({
  items: load(),

  has: (it) => get().items.some((i) => itemKey(i) === itemKey(it)),

  add: (it) =>
    set((s) => {
      if (s.items.some((i) => itemKey(i) === itemKey(it))) return s;
      const items = [...s.items, pick(it)];
      save(items);
      return { items };
    }),

  toggle: (it) =>
    set((s) => {
      const exists = s.items.some((i) => itemKey(i) === itemKey(it));
      const items = exists
        ? s.items.filter((i) => itemKey(i) !== itemKey(it))
        : [...s.items, pick(it)];
      save(items);
      return { items };
    }),

  remove: (key) =>
    set((s) => {
      const items = s.items.filter((i) => itemKey(i) !== key);
      save(items);
      return { items };
    }),

  clear: () =>
    set(() => {
      save([]);
      return { items: [] };
    }),
}));
