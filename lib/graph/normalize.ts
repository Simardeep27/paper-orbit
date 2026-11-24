import type {
  Author,
  BranchCoverage,
  BranchStatus,
  CitationEdge,
  DataMode,
  DemoMeta,
  Membership,
  Neighborhood,
  OrbitNode,
  Paper,
  ProviderName,
  RecommendationLink,
  RecommendationPool,
} from "@/lib/types";
import { ALL_MEMBERSHIPS } from "@/lib/types";
import { computeSimilarity, TITLE_UNAVAILABLE } from "@/lib/graph/similarity";

export interface BranchData {
  papers: Paper[];
  receivedEntries: number;
  skippedEntries: number;
  requestedLimit: number;
  nextOffset: number | null;
  status?: Exclude<BranchStatus, "empty">;
  message?: string;
}

export interface RecommendationItem {
  paper: Paper;
  rank: number;
}

export interface RecommendationData {
  items: RecommendationItem[];
  receivedEntries: number;
  skippedEntries: number;
  requestedLimit: number;
  nextOffset: number | null;
  status?: Exclude<BranchStatus, "empty">;
  message?: string;
}

export interface AssembleInput {
  center: Paper;
  references: BranchData;
  citing: BranchData;
  recommended: RecommendationData;
  mode: DataMode;
  provider: ProviderName;
  fetchedAt: string;
  recommendationPool: RecommendationPool;
  warnings?: string[];
  /** Allows deterministic fixture generation. */
  similarityComputedAt?: string;
  demo?: DemoMeta;
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function safeCount(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function safeYear(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 1000 || value > 3000) return null;
  return value;
}

export function normalizePaper(paper: Paper, fallbackFetchedAt: string): Paper {
  const authors: Author[] = (paper.authors ?? [])
    .filter((author) => author && typeof author.name === "string")
    .map((author) => ({
      id:
        typeof author.id === "string" && author.id.trim()
          ? author.id.trim()
          : null,
      name: author.name.trim().slice(0, 500),
    }))
    .filter((author) => author.name.length > 0);

  const externalIds: Paper["externalIds"] = {};
  if (paper.externalIds?.DOI?.trim()) {
    externalIds.DOI = paper.externalIds.DOI.trim();
  }
  if (paper.externalIds?.ArXiv?.trim()) {
    externalIds.ArXiv = paper.externalIds.ArXiv.trim();
  }

  return {
    id: paper.id.trim(),
    title: paper.title?.trim() || TITLE_UNAVAILABLE,
    authors,
    year: safeYear(paper.year),
    venue: paper.venue?.trim() || null,
    abstract: paper.abstract?.trim() || null,
    citationCount: safeCount(paper.citationCount),
    referenceCount: safeCount(paper.referenceCount),
    url: safeHttpUrl(paper.url),
    externalIds,
    source: paper.source,
    fetchedAt: paper.fetchedAt || fallbackFetchedAt,
  };
}

function addMembership(node: OrbitNode, membership: Membership) {
  if (!node.memberships.includes(membership)) {
    node.memberships.push(membership);
    node.memberships.sort(
      (a, b) => ALL_MEMBERSHIPS.indexOf(a) - ALL_MEMBERSHIPS.indexOf(b),
    );
  }
}

function branchStatus(
  branch: BranchData | RecommendationData,
  validCount: number,
): BranchStatus {
  if (branch.status === "error" || branch.status === "unavailable") {
    return branch.status;
  }
  return branch.receivedEntries === 0 && validCount === 0 ? "empty" : "ok";
}

function coverageFor(
  branch: BranchData | RecommendationData,
  validDistinct: number,
): BranchCoverage {
  const coverage: BranchCoverage = {
    status: branchStatus(branch, validDistinct),
    requestedLimit: branch.requestedLimit,
    receivedEntries: branch.receivedEntries,
    validDistinctPapers: validDistinct,
    skippedEntries: branch.skippedEntries,
    nextOffset: branch.nextOffset,
  };
  if (branch.message) coverage.message = branch.message;
  return coverage;
}

/**
 * Assemble one bounded ego-neighborhood with the required invariants:
 * one node per canonical ID, memberships merged, directed citation edges
 * observed only from the two citation endpoints, and recommendations kept
 * in a separate association list.
 */
export function assembleNeighborhood(input: AssembleInput): Neighborhood {
  const fallbackFetchedAt = input.fetchedAt;
  const center = normalizePaper(input.center, fallbackFetchedAt);
  if (!center.id) throw new Error("Center paper has no usable identifier.");

  const nodes = new Map<string, OrbitNode>();
  const memberships = new Map<string, Set<Membership>>();
  const recommendationRanks = new Map<string, number>();
  const warnings = [...(input.warnings ?? [])];
  const seenReferenceIds = new Set<string>();
  const seenCitingIds = new Set<string>();
  const seenRecommendedIds = new Set<string>();

  nodes.set(center.id, {
    paper: { ...center, fetchedAt: center.fetchedAt || fallbackFetchedAt },
    memberships: [],
    recommendationRank: null,
    textSimilarity: null,
    similarityCoverage: "unavailable",
  });
  memberships.set(center.id, new Set());
  let centerAsNeighbor = 0;

  const register = (
    rawPaper: Paper,
    membership: Membership,
    rank: number | null,
    branchSeen: Set<string>,
  ): boolean => {
    const paper = normalizePaper(rawPaper, fallbackFetchedAt);
    if (!paper.id) return false;
    if (paper.id === center.id) {
      centerAsNeighbor += 1;
      return false;
    }
    if (branchSeen.has(paper.id)) return false;
    branchSeen.add(paper.id);

    const existing = nodes.get(paper.id);
    if (!existing) {
      // Central metadata always wins. This branch order (references, citing,
      // recommendations) is the documented deterministic tie-breaker.
      nodes.set(paper.id, {
        paper,
        memberships: [],
        recommendationRank: null,
        textSimilarity: null,
        similarityCoverage: "unavailable",
      });
      memberships.set(paper.id, new Set());
    }
    const node = nodes.get(paper.id)!;
    addMembership(node, membership);
    memberships.get(paper.id)!.add(membership);
    if (rank !== null) {
      const current = recommendationRanks.get(paper.id);
      if (current === undefined || rank < current) {
        recommendationRanks.set(paper.id, rank);
        node.recommendationRank = rank;
      }
    }
    return true;
  };

  const referenceIds: string[] = [];
  for (const paper of input.references.papers) {
    if (register(paper, "reference", null, seenReferenceIds)) {
      referenceIds.push(paper.id.trim());
    }
  }
  const citingIds: string[] = [];
  for (const paper of input.citing.papers) {
    if (register(paper, "citing", null, seenCitingIds)) {
      citingIds.push(paper.id.trim());
    }
  }
  const recommendedIds: string[] = [];
  for (const item of input.recommended.items) {
    if (
      register(item.paper, "recommended", item.rank, seenRecommendedIds)
    ) {
      recommendedIds.push(item.paper.id.trim());
    }
  }

  if (centerAsNeighbor > 0) {
    warnings.push(
      `${centerAsNeighbor} branch ${
        centerAsNeighbor === 1 ? "entry duplicated" : "entries duplicated"
      } the center paper and ${centerAsNeighbor === 1 ? "was" : "were"} removed from the neighbor set.`,
    );
  }

  const skippedByBranch = {
    references: input.references.skippedEntries,
    citing: input.citing.skippedEntries,
    recommended: input.recommended.skippedEntries,
  };
  for (const [label, count] of Object.entries(skippedByBranch)) {
    if (count > 0) {
      warnings.push(
        `${count} ${label} ${
          count === 1 ? "entry lacked" : "entries lacked"
        } a usable paper identifier and ${count === 1 ? "was" : "were"} skipped.`,
      );
    }
  }
  for (const [label, branch] of [
    ["References", input.references],
    ["Citing papers", input.citing],
    ["Recommendations", input.recommended],
  ] as const) {
    if (branch.status === "error") {
      warnings.push(
        `${label} could not be retrieved: ${branch.message ?? "provider error"}. This is a failed branch, not an empty result.`,
      );
    } else if (branch.status === "unavailable") {
      warnings.push(
        `${label} are unavailable: ${branch.message ?? "provider did not return this branch"}.`,
      );
    }
  }

  const edges: CitationEdge[] = [];
  const edgeKeys = new Set<string>();
  const pushEdge = (edge: CitationEdge) => {
    if (edge.source === edge.target) return;
    const key = `${edge.source}->${edge.target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(edge);
  };
  for (const target of referenceIds) {
    pushEdge({
      id: `cit:${center.id}->${target}`,
      source: center.id,
      target,
      kind: "citation",
      evidence: "references-endpoint",
    });
  }
  for (const source of citingIds) {
    pushEdge({
      id: `cit:${source}->${center.id}`,
      source,
      target: center.id,
      kind: "citation",
      evidence: "citations-endpoint",
    });
  }

  const recommendations: RecommendationLink[] = [];
  for (const target of recommendedIds) {
    const rank = recommendationRanks.get(target);
    if (rank === undefined) continue;
    recommendations.push({
      id: `rec:${center.id}->${target}`,
      source: center.id,
      target,
      kind: "recommendation",
      pool: input.recommendationPool,
      rank,
    });
  }
  recommendations.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  const referenceValidDistinct = new Set(referenceIds).size;
  const citingValidDistinct = new Set(citingIds).size;
  const recommendedValidDistinct = new Set(recommendedIds).size;

  const coverage = {
    references: coverageFor(input.references, referenceValidDistinct),
    citing: coverageFor(input.citing, citingValidDistinct),
    recommended: coverageFor(input.recommended, recommendedValidDistinct),
  };

  const orderedNodes = [...nodes.values()].sort((a, b) => {
    if (a.paper.id === center.id) return -1;
    if (b.paper.id === center.id) return 1;
    return (
      a.paper.title.localeCompare(b.paper.title) ||
      a.paper.id.localeCompare(b.paper.id)
    );
  });

  // Scores are computed over the full loaded corpus, never a filtered subset.
  const similarity = computeSimilarity(
    center,
    orderedNodes
      .filter((node) => node.paper.id !== center.id)
      .map((node) => node.paper),
    input.similarityComputedAt ?? input.fetchedAt,
  );
  for (const node of orderedNodes) {
    if (node.paper.id === center.id) {
      node.textSimilarity = null;
      node.similarityCoverage = "unavailable";
      continue;
    }
    const score = similarity.scores.get(node.paper.id);
    node.textSimilarity = score?.score ?? null;
    node.similarityCoverage = score?.coverage ?? "unavailable";
  }

  const result: Neighborhood = {
    schemaVersion: 1,
    centerId: center.id,
    nodes: orderedNodes,
    edges,
    recommendations,
    mode: input.mode,
    provider: input.provider,
    fetchedAt: input.fetchedAt,
    recommendationPool: input.recommendationPool,
    coverage,
    warnings,
    similarity: similarity.meta,
  };
  if (input.demo) result.demo = input.demo;
  return result;
}
