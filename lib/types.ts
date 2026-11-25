/**
 * Canonical, provider-independent data contracts for Paper Orbit.
 * Provider payloads never cross this boundary; see lib/providers/*.
 */

export type Membership = "reference" | "citing" | "recommended";
export type BranchStatus = "ok" | "empty" | "error" | "unavailable";
export type DataMode = "live" | "snapshot" | "synthetic-demo";
export type SourceMode = "live" | "demo" | "snapshot";
export type ProviderName = "semantic-scholar" | "openalex" | "synthetic-test";
export type RecommendationPool = "recent" | "all-cs";
export type ViewMode = "3d" | "2d" | "list";
export type LayoutMode = "similarity-radius" | "even-shell";
export type SortKey =
  | "similarity"
  | "citations"
  | "newest"
  | "oldest"
  | "recommendation";

export interface Author {
  id: string | null;
  name: string;
}

export interface Paper {
  /** Canonical provider paper ID. */
  id: string;
  title: string;
  authors: Author[];
  year: number | null;
  venue: string | null;
  abstract: string | null;
  /** Provider-wide citation count, not the visible degree. */
  citationCount: number | null;
  referenceCount: number | null;
  url: string | null;
  externalIds: { DOI?: string; ArXiv?: string };
  source: ProviderName;
  /** ISO timestamp for when this record was obtained from the provider. */
  fetchedAt: string;
}

export type SimilarityCoverage = "title+abstract" | "title-only" | "unavailable";

export interface OrbitNode {
  paper: Paper;
  /** A paper may belong to more than one branch. */
  memberships: Membership[];
  recommendationRank: number | null;
  /** Local TF-IDF cosine to the center; null means it could not be computed. */
  textSimilarity: number | null;
  similarityCoverage: SimilarityCoverage;
}

export interface CitationEdge {
  id: string;
  /** Citing paper. */
  source: string;
  /** Cited paper. */
  target: string;
  kind: "citation";
  evidence: "references-endpoint" | "citations-endpoint";
}

export interface RecommendationLink {
  id: string;
  source: string;
  target: string;
  /** Undirected visual association. Never a citation. */
  kind: "recommendation";
  pool: RecommendationPool;
  rank: number;
}

export interface BranchCoverage {
  status: BranchStatus;
  requestedLimit: number;
  receivedEntries: number;
  validDistinctPapers: number;
  skippedEntries: number;
  nextOffset: number | null;
  message?: string;
}

export interface SimilarityRun {
  algorithm: "tfidf-cosine";
  version: "1.0.0";
  corpusIds: string[];
  computedAt: string;
}

export interface DemoMeta {
  /** Center IDs with a stored offline neighborhood. */
  availableCenterIds: string[];
  notice: string;
}

export interface Neighborhood {
  schemaVersion: 1;
  centerId: string;
  nodes: OrbitNode[];
  edges: CitationEdge[];
  recommendations: RecommendationLink[];
  mode: DataMode;
  provider: ProviderName;
  fetchedAt: string;
  recommendationPool: RecommendationPool;
  coverage: {
    references: BranchCoverage;
    citing: BranchCoverage;
    recommended: BranchCoverage;
  };
  warnings: string[];
  similarity: SimilarityRun;
  /** Present only for the synthetic offline demo. */
  demo?: DemoMeta;
  /** Present for stored real snapshots; same offline-center contract. */
  offline?: DemoMeta;
}

export interface Filters {
  /** OR across selected memberships. */
  relationships: Membership[];
  yearStart: number | null;
  yearEnd: number | null;
  includeUnknownYear: boolean;
  minCitations: number;
  includeUnknownCitations: boolean;
  minSimilarity: number;
  includeUnavailableSimilarity: boolean;
  /** Local loaded-text filter; never an upstream search. */
  text: string;
}

export interface ExplorerHistoryEntry {
  centerId: string;
  centerTitle: string;
  filters: Filters;
  view: ViewMode;
  layout: LayoutMode;
  visitedAt: string;
}

export type ExplorerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "partial"
  | "error";

export interface SearchResultSet {
  papers: Paper[];
  nextOffset: number | null;
  sourceMode: SourceMode;
  fetchedAt: string;
  /** Demo-only: centers with a stored synthetic neighborhood. */
  demoAvailableCenterIds?: string[];
  /** Snapshot-only: centers with a stored snapshot neighborhood. */
  snapshotAvailableCenterIds?: string[];
}

export interface ResolveResult {
  paper: Paper;
  sourceMode: SourceMode;
}

export interface HealthResult {
  ok: true;
  liveConfigured: boolean;
  liveProvider?: "semantic-scholar" | "openalex";
  liveKeyConfigured: boolean;
  demoAvailable: boolean;
  snapshotAvailable: boolean;
}

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "UPSTREAM_TIMEOUT"
  | "PROVIDER_CONFIGURATION"
  | "INVALID_PROVIDER_RESPONSE"
  | "DEMO_CENTER_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    retryAfterSeconds?: number;
    retryable: boolean;
  };
}

export interface SavedPaper {
  paper: Paper;
  note: string;
  savedAt: string;
  sourceCenterId: string | null;
  sourceCenterTitle: string | null;
}

export interface ReadingListDocument {
  version: 1;
  items: SavedPaper[];
}

export interface LayoutPosition {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Distance from the center, used by both 3D and 2D projections. */
  radius: number;
  /** Deterministic azimuth in radians, stable across filters. */
  angle: number;
}

export interface SceneModel {
  layout: LayoutMode;
  positions: Map<string, LayoutPosition>;
  minSimilarity: number | null;
  maxSimilarity: number | null;
  citationMax: number;
  citationMin: number;
}

export const ALL_MEMBERSHIPS: Membership[] = [
  "reference",
  "citing",
  "recommended",
];

export const DEFAULT_FILTERS: Filters = {
  relationships: [...ALL_MEMBERSHIPS],
  yearStart: null,
  yearEnd: null,
  includeUnknownYear: true,
  minCitations: 0,
  includeUnknownCitations: true,
  minSimilarity: 0,
  includeUnavailableSimilarity: true,
  text: "",
};

export const SIMILARITY_HELP =
  "Based on overlapping words in available titles and abstracts within this loaded neighborhood. It can miss conceptual similarity.";

export const RELATIONSHIP_LABELS: Record<Membership, string> = {
  reference: "Reference",
  citing: "Citing",
  recommended: "Recommended",
};
