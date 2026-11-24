import { create } from "zustand";
import type { Paper, SavedPaper } from "@/lib/types";
import {
  loadReadingList,
  paperToSavedPaper,
  saveReadingList,
} from "@/lib/state/persistence";

export interface ReadingListState {
  items: SavedPaper[];
  hydrated: boolean;
  storageWarning: string | null;
  lastMessage: string | null;
}

interface ReadingListActions {
  hydrate: () => void;
  addPaper: (
    paper: Paper,
    centerId: string | null,
    centerTitle: string | null,
  ) => "added" | "existing";
  removePaper: (id: string) => void;
  togglePaper: (
    paper: Paper,
    centerId: string | null,
    centerTitle: string | null,
  ) => "added" | "removed";
  updateNote: (id: string, note: string) => void;
  clearAll: () => void;
  dismissWarning: () => void;
  isSaved: (id: string) => boolean;
}

export type ReadingListStore = ReadingListState & ReadingListActions;

function persist(items: SavedPaper[]): {
  storageWarning: string | null;
} {
  const result = saveReadingList(items);
  return { storageWarning: result.warning };
}

export const useReadingListStore = create<ReadingListStore>((set, get) => ({
  items: [],
  hydrated: false,
  storageWarning: null,
  lastMessage: null,

  hydrate: () => {
    if (get().hydrated) return;
    const result = loadReadingList();
    set({
      items: result.items,
      hydrated: true,
      storageWarning: result.warning,
    });
  },

  addPaper: (paper, centerId, centerTitle) => {
    const state = get();
    if (state.items.some((item) => item.paper.id === paper.id)) {
      set({ lastMessage: "This paper is already in your reading list." });
      return "existing";
    }
    const items = [
      ...state.items,
      paperToSavedPaper(paper, centerId, centerTitle),
    ];
    set({
      items,
      hydrated: true,
      lastMessage: `Saved "${paper.title}" to the reading list.`,
      ...persist(items),
    });
    return "added";
  },

  removePaper: (id) => {
    const state = get();
    const items = state.items.filter((item) => item.paper.id !== id);
    set({
      items,
      lastMessage: "Removed paper from the reading list.",
      ...persist(items),
    });
  },

  togglePaper: (paper, centerId, centerTitle) => {
    const state = get();
    if (state.items.some((item) => item.paper.id === paper.id)) {
      get().removePaper(paper.id);
      return "removed";
    }
    get().addPaper(paper, centerId, centerTitle);
    return "added";
  },

  updateNote: (id, note) => {
    const state = get();
    const items = state.items.map((item) =>
      item.paper.id === id
        ? { ...item, note: note.slice(0, 10_000) }
        : item,
    );
    set({
      items,
      lastMessage: "Reading note updated.",
      ...persist(items),
    });
  },

  clearAll: () => {
    set({
      items: [],
      lastMessage: "Reading list cleared.",
      ...persist([]),
    });
  },

  dismissWarning: () => set({ storageWarning: null }),

  isSaved: (id) => get().items.some((item) => item.paper.id === id),
}));
