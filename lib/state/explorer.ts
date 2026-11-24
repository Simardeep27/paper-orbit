import { create } from "zustand";
import type {
  ApiErrorCode,
  ExplorerHistoryEntry,
  ExplorerStatus,
  Filters,
  LayoutMode,
  Membership,
  Neighborhood,
  OrbitNode,
  Paper,
  SortKey,
  SourceMode,
  ViewMode,
} from "@/lib/types";
import { ALL_MEMBERSHIPS, DEFAULT_FILTERS } from "@/lib/types";
import { neighborhoodSchema } from "@/lib/schemas";
import {
  getCenterNode,
  getNodeById,
  nodeMatchesFilters,
} from "@/lib/graph/selectors";
import { syncBrowserUrl } from "@/lib/state/url";

const MAX_HISTORY = 30;
const MAX_CACHED_NEIGHBORHOODS = 8;

export interface LoadCenterOptions {
  mode?: SourceMode;
  historyMode?: "push" | "replace" | "none";
  filters?: Filters;
  view?: ViewMode;
  layout?: LayoutMode;
  sort?: SortKey;
  historyIndex?: number;
  force?: boolean;
}

export interface ExplorerState {
  neighborhood: Neighborhood | null;
  centerId: string | null;
  selectedPaperId: string | null;
  hoveredPaperId: string | null;
  compareIds: string[];
  comparePapers: Record<string, Paper>;
  filters: Filters;
  sort: SortKey;
  view: ViewMode;
  layout: LayoutMode;
  history: ExplorerHistoryEntry[];
  historyIndex: number;
  requestGeneration: number;
  status: ExplorerStatus;
  error: string | null;
  errorCode: ApiErrorCode | null;
  loadingCenterId: string | null;
  sourceMode: SourceMode;
  neighborhoodCache: Record<string, Neighborhood>;
  autoRotate: boolean;
  webglFailed: boolean;
  resetCameraNonce: number;
  locateNonce: number;
  announcement: string;
  announcementId: number;
}

interface ExplorerActions {
  loadCenter: (centerId: string, options?: LoadCenterOptions) => Promise<void>;
  retryCurrent: () => Promise<void>;
  clearError: () => void;
  selectPaper: (id: string | null) => void;
  setHoveredPaper: (id: string | null) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  setSort: (sort: SortKey) => void;
  setView: (view: ViewMode) => void;
  setLayout: (layout: LayoutMode) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  setAutoRotate: (value: boolean) => void;
  requestLocate: () => void;
  requestResetCamera: () => void;
  markWebglFailed: () => void;
  retryWebgl: () => void;
  announce: (message: string) => void;
  touchHistory: () => void;
  cancelPending: () => void;
}

export type ExplorerStore = ExplorerState & ExplorerActions;

class ApiClientError extends Error {
  code: ApiErrorCode;

  constructor(message: string, code: ApiErrorCode) {
    super(message);
    this.code = code;
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeFilters(current: Filters, patch: Partial<Filters>): Filters {
  const raw = { ...current, ...patch };
  const relationships = [...new Set(raw.relationships)].filter(
    (membership): membership is Membership =>
      ALL_MEMBERSHIPS.includes(membership),
  );
  relationships.sort(
    (a, b) => ALL_MEMBERSHIPS.indexOf(a) - ALL_MEMBERSHIPS.indexOf(b),
  );
  let yearStart =
    raw.yearStart === null ? null : clampInt(raw.yearStart, 1000, 3000);
  let yearEnd =
    raw.yearEnd === null ? null : clampInt(raw.yearEnd, 1000, 3000);
  if (yearStart !== null && yearEnd !== null && yearStart > yearEnd) {
    [yearStart, yearEnd] = [yearEnd, yearStart];
  }
  return {
    relationships,
    yearStart,
    yearEnd,
    includeUnknownYear: Boolean(raw.includeUnknownYear),
    minCitations:
      raw.minCitations === null
        ? 0
        : clampInt(raw.minCitations, 0, 1_000_000),
    includeUnknownCitations: Boolean(raw.includeUnknownCitations),
    minSimilarity: Math.min(1, Math.max(0, Number(raw.minSimilarity) || 0)),
    includeUnavailableSimilarity: Boolean(raw.includeUnavailableSimilarity),
    text: (raw.text ?? "").slice(0, 300),
  };
}

function cacheKey(mode: SourceMode, centerId: string): string {
  return `${mode}:${centerId}`;
}

function syncCurrentBrowserUrl(state: ExplorerState): void {
  if (!state.centerId) return;
  syncBrowserUrl(
    {
      centerId: state.centerId,
      sourceMode: state.sourceMode,
      view: state.view,
      layout: state.layout,
      filters: state.filters,
      sort: state.sort,
    },
    { push: false, index: state.historyIndex },
  );
}

function cacheNeighborhood(
  cache: Record<string, Neighborhood>,
  mode: SourceMode,
  neighborhood: Neighborhood,
): Record<string, Neighborhood> {
  const key = cacheKey(mode, neighborhood.centerId);
  const next = { ...cache };
  delete next[key];
  next[key] = neighborhood;
  const keys = Object.keys(next);
  while (keys.length > MAX_CACHED_NEIGHBORHOODS) {
    const oldest = keys.shift();
    if (oldest) delete next[oldest];
  }
  return next;
}

function hasPartialBranches(neighborhood: Neighborhood): boolean {
  return Object.values(neighborhood.coverage).some(
    (branch) => branch.status === "error" || branch.status === "unavailable",
  );
}

function cloneFilters(filters: Filters): Filters {
  return { ...filters, relationships: [...filters.relationships] };
}

function entryFor(
  neighborhood: Neighborhood,
  filters: Filters,
  view: ViewMode,
  layout: LayoutMode,
): ExplorerHistoryEntry {
  const center = getCenterNode(neighborhood);
  return {
    centerId: neighborhood.centerId,
    centerTitle: center?.paper.title ?? "Title unavailable.",
    filters: cloneFilters(filters),
    view,
    layout,
    visitedAt: new Date().toISOString(),
  };
}

function selectionStillVisible(
  state: ExplorerState,
  filters: Filters,
): boolean {
  if (!state.neighborhood || !state.selectedPaperId) return true;
  if (state.selectedPaperId === state.neighborhood.centerId) return true;
  const node = getNodeById(state.neighborhood, state.selectedPaperId);
  return Boolean(node && nodeMatchesFilters(node, filters));
}

let activeController: AbortController | null = null;

export const useExplorerStore = create<ExplorerStore>((set, get) => ({
  neighborhood: null,
  centerId: null,
  selectedPaperId: null,
  hoveredPaperId: null,
  compareIds: [],
  comparePapers: {},
  filters: { ...DEFAULT_FILTERS, relationships: [...DEFAULT_FILTERS.relationships] },
  sort: "similarity",
  view: "3d",
  layout: "similarity-radius",
  history: [],
  historyIndex: -1,
  requestGeneration: 0,
  status: "idle",
  error: null,
  errorCode: null,
  loadingCenterId: null,
  sourceMode: "demo",
  neighborhoodCache: {},
  autoRotate: false,
  webglFailed: false,
  resetCameraNonce: 0,
  locateNonce: 0,
  announcement: "",
  announcementId: 0,

  loadCenter: async (centerId, options = {}) => {
    const state = get();
    const mode = options.mode ?? state.sourceMode;
    const modeChanged = mode !== state.sourceMode;
    const sameCenter = state.centerId === centerId;
    const cached = options.force
      ? undefined
      : state.neighborhoodCache[cacheKey(mode, centerId)];

    const offlineContext =
      state.neighborhood?.offline ?? state.neighborhood?.demo;
    if (
      mode !== "live" &&
      offlineContext &&
      !sameCenter &&
      !offlineContext.availableCenterIds.includes(centerId)
    ) {
      const label = mode === "snapshot" ? "stored offline snapshot" : "offline demo";
      set({
        error: `This paper's neighborhood is not included in the ${label}. It can still be inspected and added to your reading list from the current neighborhood.`,
        errorCode: "DEMO_CENTER_UNAVAILABLE",
        loadingCenterId: null,
        status: state.neighborhood ? "partial" : "error",
        announcement:
          "Recenter unavailable: this paper has no stored offline neighborhood.",
        announcementId: state.announcementId + 1,
      });
      return;
    }

    if (!options.force && sameCenter && state.neighborhood && !modeChanged) {
      const filters = options.filters ?? state.filters;
      const view = options.view ?? state.view;
      const layout = options.layout ?? state.layout;
      const sort = options.sort ?? state.sort;
      const historyIndex =
        typeof options.historyIndex === "number" &&
        options.historyIndex >= 0 &&
        options.historyIndex < state.history.length
          ? options.historyIndex
          : state.historyIndex;
      const selectedPaperId = selectionStillVisible(
        { ...state, filters },
        filters,
      )
        ? state.selectedPaperId
        : null;
      set({
        filters,
        view,
        layout,
        sort,
        historyIndex,
        selectedPaperId,
        error: null,
        errorCode: null,
        status: hasPartialBranches(state.neighborhood) ? "partial" : "ready",
        announcement: selectedPaperId
          ? state.announcement
          : "Selected paper is hidden by the current filters.",
        announcementId: selectedPaperId
          ? state.announcementId
          : state.announcementId + 1,
      });
      const current = get();
      syncBrowserUrl(
        {
          centerId,
          sourceMode: mode,
          view: current.view,
          layout: current.layout,
          filters: current.filters,
          sort: current.sort,
        },
        { push: false, index: current.historyIndex },
      );
      return;
    }

    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const generation = state.requestGeneration + 1;

    const targetInOldGraph = Boolean(
      state.neighborhood?.nodes.some((node) => node.paper.id === centerId),
    );

    set({
      requestGeneration: generation,
      status: "loading",
      loadingCenterId: centerId,
      error: null,
      errorCode: null,
      selectedPaperId: targetInOldGraph
        ? centerId
        : state.selectedPaperId,
      sourceMode: state.neighborhood ? state.sourceMode : mode,
      announcement: `Loading the neighborhood around the selected paper.`,
      announcementId: state.announcementId + 1,
    });

    const commit = (neighborhood: Neighborhood) => {
      const current = get();
      const isNewCenter = current.centerId !== neighborhood.centerId;
      const filters = options.filters
        ? normalizeFilters(DEFAULT_FILTERS, options.filters)
        : isNewCenter
          ? {
              ...DEFAULT_FILTERS,
              relationships: [...DEFAULT_FILTERS.relationships],
            }
          : current.filters;
      const view = options.view ?? current.view;
      const layout = options.layout ?? current.layout;
      const sort = options.sort ?? current.sort;
      const entry = entryFor(neighborhood, filters, view, layout);
      const historyMode =
        options.historyMode ??
        (current.neighborhood ? "push" : "replace");

      let history = current.history.map((item) => ({
        ...item,
        filters: cloneFilters(item.filters),
      }));
      let historyIndex = current.historyIndex;

      if (historyMode === "push") {
        history = history.slice(0, current.historyIndex + 1);
        history.push(entry);
        if (history.length > MAX_HISTORY) {
          history = history.slice(history.length - MAX_HISTORY);
        }
        historyIndex = history.length - 1;
      } else if (historyMode === "replace") {
        if (history.length === 0 || current.historyIndex < 0) {
          history = [entry];
          historyIndex = 0;
        } else {
          history[current.historyIndex] = entry;
          historyIndex = current.historyIndex;
        }
      } else {
        const requested = options.historyIndex;
        if (
          typeof requested === "number" &&
          requested >= 0 &&
          requested < history.length
        ) {
          history[requested] = entry;
          historyIndex = requested;
        } else {
          const matching = history.findIndex(
            (item) => item.centerId === neighborhood.centerId,
          );
          if (matching >= 0) {
            history[matching] = entry;
            historyIndex = matching;
          } else {
            history = history.slice(0, current.historyIndex + 1);
            history.push(entry);
            historyIndex = history.length - 1;
          }
        }
      }

      const selectedPaperId = neighborhood.centerId;
      const nextStatus: ExplorerStatus = hasPartialBranches(neighborhood)
        ? "partial"
        : "ready";

      set({
        neighborhood,
        centerId: neighborhood.centerId,
        sourceMode: mode,
        filters,
        view,
        layout,
        sort,
        selectedPaperId,
        hoveredPaperId: null,
        loadingCenterId: null,
        status: nextStatus,
        error: null,
        errorCode: null,
        history,
        historyIndex,
        neighborhoodCache: cacheNeighborhood(
          current.neighborhoodCache,
          mode,
          neighborhood,
        ),
        announcement: `Loaded ${neighborhood.nodes.length - 1} ${
          neighborhood.nodes.length - 1 === 1 ? "paper" : "papers"
        } around ${entry.centerTitle}.${
          nextStatus === "partial"
            ? " Some branches are unavailable or failed."
            : ""
        }`,
        announcementId: current.announcementId + 1,
      });

      const committed = get();
      syncBrowserUrl(
        {
          centerId: committed.centerId!,
          sourceMode: committed.sourceMode,
          view: committed.view,
          layout: committed.layout,
          filters: committed.filters,
          sort: committed.sort,
        },
        { push: historyMode === "push", index: committed.historyIndex },
      );
    };

    if (cached) {
      commit(cached);
      return;
    }

    try {
      const response = await fetch(
        `/api/neighborhood?paperId=${encodeURIComponent(
          centerId,
        )}&mode=${mode}`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        const envelope = payload as
          | { error?: { message?: string; code?: ApiErrorCode } }
          | null;
        throw new ApiClientError(
          envelope?.error?.message ??
            "The neighborhood could not be loaded. Please try again.",
          envelope?.error?.code ?? "PROVIDER_UNAVAILABLE",
        );
      }
      const parsed = neighborhoodSchema.safeParse(payload);
      if (!parsed.success) {
        throw new ApiClientError(
          "The neighborhood response was not in the expected format.",
          "INVALID_PROVIDER_RESPONSE",
        );
      }
      if (get().requestGeneration !== generation) return;
      commit(parsed.data as Neighborhood);
    } catch (error) {
      if (
        controller.signal.aborted ||
        get().requestGeneration !== generation
      ) {
        return;
      }
      const message =
        error instanceof ApiClientError
          ? error.message
          : "The neighborhood could not be loaded. Please try again.";
      const code =
        error instanceof ApiClientError
          ? error.code
          : "PROVIDER_UNAVAILABLE";
      const current = get();
      set({
        loadingCenterId: null,
        error: message,
        errorCode: code,
        status: current.neighborhood ? "partial" : "error",
        announcement: `Neighborhood load failed. ${message}`,
        announcementId: current.announcementId + 1,
      });
    } finally {
      if (activeController === controller) activeController = null;
    }
  },

  retryCurrent: async () => {
    const state = get();
    if (!state.centerId) return;
    await get().loadCenter(state.centerId, {
      mode: state.sourceMode,
      filters: state.filters,
      view: state.view,
      layout: state.layout,
      sort: state.sort,
      historyMode: "replace",
      force: true,
    });
  },

  clearError: () => set({ error: null, errorCode: null }),

  selectPaper: (id) => {
    const state = get();
    if (id === null) {
      set({ selectedPaperId: null });
      return;
    }
    const node = state.neighborhood
      ? getNodeById(state.neighborhood, id)
      : undefined;
    if (!node) return;
    if (
      node.paper.id !== state.neighborhood?.centerId &&
      !nodeMatchesFilters(node, state.filters)
    ) {
      return;
    }
    set({ selectedPaperId: id });
  },

  setHoveredPaper: (id) => set({ hoveredPaperId: id }),

  setFilters: (patch) => {
    const state = get();
    const filters = normalizeFilters(state.filters, patch);
    const keepSelection = selectionStillVisible({ ...state, filters }, filters);
    set({
      filters,
      selectedPaperId: keepSelection ? state.selectedPaperId : null,
      announcement: keepSelection
        ? state.announcement
        : "The selected paper is hidden by the current filters. Selection cleared.",
      announcementId: keepSelection
        ? state.announcementId
        : state.announcementId + 1,
    });
    get().touchHistory();
    syncCurrentBrowserUrl(get());
  },

  resetFilters: () => {
    const state = get();
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      relationships: [...ALL_MEMBERSHIPS],
    };
    const keepSelection = selectionStillVisible({ ...state, filters }, filters);
    set({
      filters,
      selectedPaperId: keepSelection ? state.selectedPaperId : null,
      announcement: keepSelection
        ? state.announcement
        : "Filters reset. The selected paper is now visible.",
      announcementId: state.announcementId + 1,
    });
    get().touchHistory();
    syncCurrentBrowserUrl(get());
  },

  setSort: (sort) => {
    set({ sort });
    syncCurrentBrowserUrl(get());
  },

  setView: (view) => {
    const state = get();
    if (view === "3d" && state.webglFailed) {
      set({
        announcement:
          "3D is unavailable after a WebGL failure. Use Retry 3D from the help panel.",
        announcementId: state.announcementId + 1,
      });
      return;
    }
    set({ view });
    get().touchHistory();
    syncCurrentBrowserUrl(get());
  },

  setLayout: (layout) => {
    set({ layout });
    get().touchHistory();
    syncCurrentBrowserUrl(get());
  },

  toggleCompare: (id) => {
    const state = get();
    const node = state.neighborhood
      ? getNodeById(state.neighborhood, id)
      : undefined;
    const existingId = state.compareIds.includes(id);
    if (existingId) {
      const comparePapers = { ...state.comparePapers };
      delete comparePapers[id];
      set({
        compareIds: state.compareIds.filter((item) => item !== id),
        comparePapers,
        announcement: "Removed paper from comparison.",
        announcementId: state.announcementId + 1,
      });
      return;
    }
    const paper = node?.paper ?? state.comparePapers[id];
    if (!paper) return;
    const compareIds = [...state.compareIds];
    const comparePapers = { ...state.comparePapers, [id]: paper };
    let replaced = false;
    if (compareIds.length >= 2) {
      const removed = compareIds.shift();
      if (removed) {
        delete comparePapers[removed];
        replaced = true;
      }
    }
    compareIds.push(id);
    set({
      compareIds,
      comparePapers,
      announcement: replaced
        ? "Comparison was full; the oldest candidate was replaced."
        : "Added paper to comparison.",
      announcementId: state.announcementId + 1,
    });
  },

  clearCompare: () => set({ compareIds: [], comparePapers: {} }),

  setAutoRotate: (value) => set({ autoRotate: value }),

  requestLocate: () => {
    const state = get();
    if (!state.selectedPaperId) {
      set({
        announcement: "Select a paper before using Locate.",
        announcementId: state.announcementId + 1,
      });
      return;
    }
    set({ locateNonce: state.locateNonce + 1 });
  },

  requestResetCamera: () =>
    set((state) => ({ resetCameraNonce: state.resetCameraNonce + 1 })),

  markWebglFailed: () => {
    const state = get();
    set({
      webglFailed: true,
      view: "2d",
      announcement:
        "3D rendering is unavailable. Switched to the 2D view; all analytical tools remain available.",
      announcementId: state.announcementId + 1,
    });
    get().touchHistory();
    syncCurrentBrowserUrl(get());
  },

  retryWebgl: () => {
    const state = get();
    set({
      webglFailed: false,
      view: "3d",
      announcement: "Retrying 3D rendering.",
      announcementId: state.announcementId + 1,
    });
    get().touchHistory();
    syncCurrentBrowserUrl(get());
  },

  announce: (message) =>
    set((state) => ({
      announcement: message,
      announcementId: state.announcementId + 1,
    })),

  touchHistory: () => {
    const state = get();
    if (
      state.history.length === 0 ||
      state.historyIndex < 0 ||
      state.historyIndex >= state.history.length ||
      state.neighborhood === null
    ) {
      return;
    }
    const current = state.history[state.historyIndex];
    if (!current || current.centerId !== state.neighborhood.centerId) return;
    const history = [...state.history];
    history[state.historyIndex] = {
      ...current,
      centerTitle:
        getCenterNode(state.neighborhood)?.paper.title ?? current.centerTitle,
      filters: cloneFilters(state.filters),
      view: state.view,
      layout: state.layout,
    };
    set({ history });
  },

  cancelPending: () => {
    activeController?.abort();
    activeController = null;
    set({ loadingCenterId: null });
  },
}));

export function visibleSelectedNode(
  state: ExplorerStore,
): OrbitNode | undefined {
  if (!state.neighborhood || !state.selectedPaperId) return undefined;
  const node = getNodeById(state.neighborhood, state.selectedPaperId);
  if (!node) return undefined;
  if (
    node.paper.id !== state.neighborhood.centerId &&
    !nodeMatchesFilters(node, state.filters)
  ) {
    return undefined;
  }
  return node;
}

export function currentSourceMode(state: ExplorerStore): SourceMode {
  return state.sourceMode;
}
