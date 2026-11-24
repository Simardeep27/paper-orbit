import type {
  Neighborhood,
  Paper,
  SavedPaper,
} from "@/lib/types";
import { readingListDocumentSchema } from "@/lib/schemas";

export const READING_LIST_KEY = "paper-orbit:reading-list:v1";
export const READING_LIST_SCHEMA_VERSION = 1 as const;

export interface ReadingListLoadResult {
  items: SavedPaper[];
  warning: string | null;
}

function defaultStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadReadingList(
  storage: Storage | null = defaultStorage(),
): ReadingListLoadResult {
  if (!storage) {
    return { items: [], warning: null };
  }
  let raw: string | null;
  try {
    raw = storage.getItem(READING_LIST_KEY);
  } catch {
    return {
      items: [],
      warning:
        "Reading-list storage is blocked by the browser. Items will persist only for this session.",
    };
  }
  if (!raw) return { items: [], warning: null };
  try {
    const parsed = readingListDocumentSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        items: [],
        warning:
          "Saved reading list data was not readable. It has been left untouched until you save a new item.",
      };
    }
    return { items: parsed.data.items, warning: null };
  } catch {
    return {
      items: [],
      warning:
        "Saved reading list data was not valid JSON. It has been left untouched until you save a new item.",
    };
  }
}

export interface SaveReadingListResult {
  ok: boolean;
  warning: string | null;
}

export function saveReadingList(
  items: SavedPaper[],
  storage: Storage | null = defaultStorage(),
): SaveReadingListResult {
  if (!storage) {
    return {
      ok: false,
      warning:
        "Browser storage is unavailable. Items remain available for this session only.",
    };
  }
  try {
    storage.setItem(
      READING_LIST_KEY,
      JSON.stringify({ version: READING_LIST_SCHEMA_VERSION, items }),
    );
    return { ok: true, warning: null };
  } catch {
    return {
      ok: false,
      warning:
        "The reading list could not be saved (storage may be full or blocked). It remains available in memory for this session.",
    };
  }
}

export function paperToSavedPaper(
  paper: Paper,
  centerId: string | null,
  centerTitle: string | null,
): SavedPaper {
  return {
    paper,
    note: "",
    savedAt: new Date().toISOString(),
    sourceCenterId: centerId,
    sourceCenterTitle: centerTitle,
  };
}

export interface ExportProvenance {
  exportedAt: string;
  app: "Paper Orbit";
  similarityAlgorithm: string;
  similarityVersion: string;
  source: string;
}

export function makeExportProvenance(
  neighborhood: Neighborhood | null,
): ExportProvenance {
  return {
    exportedAt: new Date().toISOString(),
    app: "Paper Orbit",
    similarityAlgorithm: "TF-IDF cosine (local, loaded-neighborhood only)",
    similarityVersion: neighborhood?.similarity.version ?? "1.0.0",
    source: neighborhood
      ? `Reading list; last viewed center ${neighborhood.centerId} (${
          neighborhood.mode === "synthetic-demo"
            ? "synthetic demo"
            : neighborhood.mode === "snapshot"
              ? "stored Semantic Scholar snapshot"
              : neighborhood.mode
        })`
      : "Reading list; no neighborhood loaded",
  };
}
