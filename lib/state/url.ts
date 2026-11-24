import type {
  Filters,
  LayoutMode,
  SortKey,
  SourceMode,
  ViewMode,
} from "@/lib/types";
import { ALL_MEMBERSHIPS, DEFAULT_FILTERS } from "@/lib/types";
import { filtersSchema } from "@/lib/schemas";

export interface UrlExplorerState {
  centerId: string | null;
  sourceMode: SourceMode;
  view: ViewMode;
  layout: LayoutMode;
  filters: Filters;
  sort: SortKey;
}

const VIEWS: ViewMode[] = ["3d", "2d", "list"];
const LAYOUTS: LayoutMode[] = ["similarity-radius", "even-shell"];
const SORTS: SortKey[] = [
  "similarity",
  "citations",
  "newest",
  "oldest",
  "recommendation",
];

function parseBoolean(
  params: URLSearchParams,
  key: string,
  fallback: boolean,
): boolean {
  if (!params.has(key)) return fallback;
  const value = params.get(key);
  if (value === "0" || value === "false") return false;
  if (value === "1" || value === "true") return true;
  return fallback;
}

function parseIntOrNull(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
): number | null {
  if (!params.has(key)) return null;
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

function parseNumberOrNull(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
): number | null {
  if (!params.has(key)) return null;
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function parseExplorerUrl(search: string): UrlExplorerState {
  const params = new URLSearchParams(search);
  const rawCenter = params.get("center");
  const centerId =
    rawCenter && rawCenter.length <= 512 && !/\s/.test(rawCenter)
      ? rawCenter
      : null;

  const rawMode = params.get("mode");
  const sourceMode: SourceMode =
    rawMode === "live" || rawMode === "demo" || rawMode === "snapshot"
      ? rawMode
      : centerId?.startsWith("syn-") || !centerId
        ? "demo"
        : "live";

  const rawView = params.get("view");
  const view: ViewMode = VIEWS.includes(rawView as ViewMode)
    ? (rawView as ViewMode)
    : "3d";

  const rawLayout = params.get("layout");
  const layout: LayoutMode = LAYOUTS.includes(rawLayout as LayoutMode)
    ? (rawLayout as LayoutMode)
    : "similarity-radius";

  const rawSort = params.get("sort");
  const sort: SortKey = SORTS.includes(rawSort as SortKey)
    ? (rawSort as SortKey)
    : "similarity";

  let relationships: Filters["relationships"] = [...ALL_MEMBERSHIPS];
  if (params.has("rels")) {
    const raw = params.get("rels") ?? "";
    relationships = raw
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is Filters["relationships"][number] =>
        ALL_MEMBERSHIPS.includes(value as Filters["relationships"][number]),
      );
  }

  const yearStart = parseIntOrNull(params, "yearStart", 1000, 3000);
  const yearEnd = parseIntOrNull(params, "yearEnd", 1000, 3000);
  const minCitations =
    parseIntOrNull(params, "minCitations", 0, 1_000_000) ?? 0;
  const minSimilarity =
    parseNumberOrNull(params, "minSim", 0, 1) ?? 0;
  const text = (params.get("q") ?? "").slice(0, 300);

  const filters: Filters = {
    ...DEFAULT_FILTERS,
    relationships,
    yearStart,
    yearEnd,
    includeUnknownYear: parseBoolean(params, "unknownYears", true),
    minCitations,
    includeUnknownCitations: parseBoolean(params, "unknownCitations", true),
    minSimilarity,
    includeUnavailableSimilarity: parseBoolean(params, "unknownSim", true),
    text,
  };

  const validated = filtersSchema.safeParse(filters);
  return {
    centerId,
    sourceMode,
    view,
    layout,
    sort,
    filters: validated.success ? (validated.data as Filters) : DEFAULT_FILTERS,
  };
}

export interface UrlStateInput {
  centerId: string;
  sourceMode: SourceMode;
  view: ViewMode;
  layout: LayoutMode;
  filters: Filters;
  sort: SortKey;
}

export function buildExplorerUrl(state: UrlStateInput): string {
  const params = new URLSearchParams();
  params.set("center", state.centerId);
  params.set("mode", state.sourceMode);
  params.set("view", state.view);
  params.set("layout", state.layout);
  params.set("rels", state.filters.relationships.join(","));
  if (state.filters.yearStart !== null) {
    params.set("yearStart", String(state.filters.yearStart));
  }
  if (state.filters.yearEnd !== null) {
    params.set("yearEnd", String(state.filters.yearEnd));
  }
  if (!state.filters.includeUnknownYear) params.set("unknownYears", "0");
  if (state.filters.minCitations > 0) {
    params.set("minCitations", String(state.filters.minCitations));
  }
  if (!state.filters.includeUnknownCitations) {
    params.set("unknownCitations", "0");
  }
  if (state.filters.minSimilarity > 0) {
    params.set("minSim", String(state.filters.minSimilarity));
  }
  if (!state.filters.includeUnavailableSimilarity) {
    params.set("unknownSim", "0");
  }
  if (state.filters.text.trim()) params.set("q", state.filters.text.trim());
  if (state.sort !== "similarity") params.set("sort", state.sort);
  return `/explore?${params.toString()}`;
}

export interface BrowserEntryState {
  paperOrbit: true;
  paperOrbitIndex: number;
}

export function syncBrowserUrl(
  state: UrlStateInput,
  options: { push: boolean; index: number },
): void {
  if (typeof window === "undefined") return;
  const url = buildExplorerUrl(state);
  const current = window.location.pathname + window.location.search;
  const nextState: BrowserEntryState = {
    paperOrbit: true,
    paperOrbitIndex: options.index,
  };
  if (current === url) {
    window.history.replaceState(nextState, "", url);
    return;
  }
  if (options.push) {
    window.history.pushState(nextState, "", url);
  } else {
    window.history.replaceState(nextState, "", url);
  }
}

export function readBrowserHistoryIndex(): number | null {
  if (typeof window === "undefined") return null;
  const state = window.history.state as Partial<BrowserEntryState> | null;
  if (state && state.paperOrbit === true && typeof state.paperOrbitIndex === "number") {
    return state.paperOrbitIndex;
  }
  return null;
}
