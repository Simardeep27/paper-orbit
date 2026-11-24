import type {
  CitationEdge,
  Filters,
  Membership,
  Neighborhood,
  OrbitNode,
  RecommendationLink,
  SortKey,
} from "@/lib/types";
import { ALL_MEMBERSHIPS } from "@/lib/types";
import { TITLE_UNAVAILABLE } from "@/lib/graph/similarity";

export function getCenterNode(
  neighborhood: Neighborhood,
): OrbitNode | undefined {
  return neighborhood.nodes.find(
    (node) => node.paper.id === neighborhood.centerId,
  );
}

export function getNeighborNodes(neighborhood: Neighborhood): OrbitNode[] {
  return neighborhood.nodes.filter(
    (node) => node.paper.id !== neighborhood.centerId,
  );
}

export function getNodeById(
  neighborhood: Neighborhood,
  id: string | null,
): OrbitNode | undefined {
  if (!id) return undefined;
  return neighborhood.nodes.find((node) => node.paper.id === id);
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim();
}

function matchesText(node: OrbitNode, text: string): boolean {
  const query = normalizeSearch(text);
  if (!query) return true;
  const pieces = [
    node.paper.title,
    node.paper.venue ?? "",
    ...node.paper.authors.map((author) => author.name),
  ];
  return pieces.some((piece) => normalizeSearch(piece).includes(query));
}

export interface MatchOptions {
  /** Exclude year bounds and unknown-year inclusion (histogram context). */
  ignoreYear?: boolean;
}

export function nodeMatchesFilters(
  node: OrbitNode,
  filters: Filters,
  options: MatchOptions = {},
): boolean {
  const relationshipMatch = filters.relationships.some((membership) =>
    node.memberships.includes(membership),
  );
  if (!relationshipMatch) return false;

  if (!options.ignoreYear) {
    const year = node.paper.year;
    if (year === null) {
      if (!filters.includeUnknownYear) return false;
    } else {
      if (filters.yearStart !== null && year < filters.yearStart) return false;
      if (filters.yearEnd !== null && year > filters.yearEnd) return false;
    }
  }

  const citations = node.paper.citationCount;
  if (citations === null) {
    if (!filters.includeUnknownCitations) return false;
  } else if (citations < filters.minCitations) {
    return false;
  }

  const similarity = node.textSimilarity;
  if (similarity === null) {
    if (!filters.includeUnavailableSimilarity) return false;
  } else if (similarity < filters.minSimilarity) {
    return false;
  }

  return matchesText(node, filters.text);
}

export interface VisibleNeighborhood {
  center: OrbitNode | undefined;
  neighbors: OrbitNode[];
  visibleIds: Set<string>;
  nodes: OrbitNode[];
  edges: CitationEdge[];
  recommendations: RecommendationLink[];
}

export function getVisibleNeighborhood(
  neighborhood: Neighborhood,
  filters: Filters,
): VisibleNeighborhood {
  const center = getCenterNode(neighborhood);
  const neighbors = getNeighborNodes(neighborhood).filter((node) =>
    nodeMatchesFilters(node, filters),
  );
  const visibleIds = new Set<string>([
    neighborhood.centerId,
    ...neighbors.map((node) => node.paper.id),
  ]);
  return {
    center,
    neighbors,
    visibleIds,
    nodes: center ? [center, ...neighbors] : [...neighbors],
    edges: neighborhood.edges.filter(
      (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
    ),
    recommendations: neighborhood.recommendations.filter(
      (link) => visibleIds.has(link.source) && visibleIds.has(link.target),
    ),
  };
}

export interface HistogramBin {
  year: number;
  context: number;
  visible: number;
}

export interface YearHistogramData {
  bins: HistogramBin[];
  unknown: { context: number; visible: number };
  domain: [number, number] | null;
  contextTotal: number;
  visibleTotal: number;
}

/**
 * Context counts apply every filter except the histogram's own year filter.
 * The center is never included. Visible counts apply the full filter set.
 */
export function getYearHistogram(
  neighborhood: Neighborhood,
  filters: Filters,
): YearHistogramData {
  const neighbors = getNeighborNodes(neighborhood);
  const context = neighbors.filter((node) =>
    nodeMatchesFilters(node, filters, { ignoreYear: true }),
  );
  const visible = neighbors.filter((node) =>
    nodeMatchesFilters(node, filters),
  );

  const years = new Set<number>();
  for (const node of neighbors) {
    if (node.paper.year !== null) years.add(node.paper.year);
  }

  const contextCounts = new Map<number, number>();
  const visibleCounts = new Map<number, number>();
  let unknownContext = 0;
  let unknownVisible = 0;
  for (const node of context) {
    if (node.paper.year === null) unknownContext += 1;
    else {
      contextCounts.set(
        node.paper.year,
        (contextCounts.get(node.paper.year) ?? 0) + 1,
      );
    }
  }
  for (const node of visible) {
    if (node.paper.year === null) unknownVisible += 1;
    else {
      visibleCounts.set(
        node.paper.year,
        (visibleCounts.get(node.paper.year) ?? 0) + 1,
      );
    }
  }

  const sortedYears = [...years].sort((a, b) => a - b);
  return {
    bins: sortedYears.map((year) => ({
      year,
      context: contextCounts.get(year) ?? 0,
      visible: visibleCounts.get(year) ?? 0,
    })),
    unknown: { context: unknownContext, visible: unknownVisible },
    domain:
      sortedYears.length > 0
        ? [sortedYears[0], sortedYears[sortedYears.length - 1]]
        : null,
    contextTotal: context.length,
    visibleTotal: visible.length,
  };
}

export function countMemberships(
  nodes: OrbitNode[],
): Record<Membership, number> {
  const counts: Record<Membership, number> = {
    reference: 0,
    citing: 0,
    recommended: 0,
  };
  for (const node of nodes) {
    for (const membership of node.memberships) counts[membership] += 1;
  }
  return counts;
}

function compareText(a: string, b: string): number {
  const left = a.normalize("NFKC").toLowerCase();
  const right = b.normalize("NFKC").toLowerCase();
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function tieBreak(a: OrbitNode, b: OrbitNode): number {
  const title =
    a.paper.title === TITLE_UNAVAILABLE ? "zzzz" : a.paper.title;
  const other =
    b.paper.title === TITLE_UNAVAILABLE ? "zzzz" : b.paper.title;
  return compareText(title, other) || compareText(a.paper.id, b.paper.id);
}

function compareNullable(
  a: number | null,
  b: number | null,
  direction: "asc" | "desc",
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

/** Nulls sort last in every direction; title then ID are deterministic ties. */
export function sortNeighborNodes(
  nodes: OrbitNode[],
  sort: SortKey,
): OrbitNode[] {
  const copy = [...nodes];
  copy.sort((a, b) => {
    let primary = 0;
    switch (sort) {
      case "similarity":
        primary = compareNullable(a.textSimilarity, b.textSimilarity, "desc");
        break;
      case "citations":
        primary = compareNullable(
          a.paper.citationCount,
          b.paper.citationCount,
          "desc",
        );
        break;
      case "newest":
        primary = compareNullable(a.paper.year, b.paper.year, "desc");
        break;
      case "oldest":
        primary = compareNullable(a.paper.year, b.paper.year, "asc");
        break;
      case "recommendation":
        primary = compareNullable(
          a.recommendationRank,
          b.recommendationRank,
          "asc",
        );
        break;
    }
    return primary || tieBreak(a, b);
  });
  return copy;
}

export function getRelationshipDescription(
  node: OrbitNode,
  centerId: string,
  pool: Neighborhood["recommendationPool"],
): string[] {
  if (node.paper.id === centerId) return ["Center paper"];
  const descriptions: string[] = [];
  if (node.memberships.includes("reference")) {
    descriptions.push("The center paper cites this paper (reference branch).");
  }
  if (node.memberships.includes("citing")) {
    descriptions.push("This paper cites the center paper (citing branch).");
  }
  if (node.memberships.includes("recommended")) {
    descriptions.push(
      `Provider recommendation${
        node.recommendationRank !== null
          ? ` ranked #${node.recommendationRank}`
          : ""
      } from the ${pool} candidate pool. Rank is ordering, not a similarity score.`,
    );
  }
  return descriptions;
}

export function isCenterAvailableOffline(
  neighborhood: Neighborhood,
  id: string,
): boolean {
  const offline = neighborhood.offline ?? neighborhood.demo;
  if (!offline) return true;
  return offline.availableCenterIds.includes(id);
}

export function getVisibleCountLabel(visible: number, loaded: number): string {
  return `${visible} of ${loaded} loaded ${loaded === 1 ? "paper" : "papers"} shown`;
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.relationships.length !== ALL_MEMBERSHIPS.length ||
    filters.yearStart !== null ||
    filters.yearEnd !== null ||
    !filters.includeUnknownYear ||
    filters.minCitations > 0 ||
    !filters.includeUnknownCitations ||
    filters.minSimilarity > 0 ||
    !filters.includeUnavailableSimilarity ||
    filters.text.trim().length > 0
  );
}

export function getMembershipLabel(membership: Membership): string {
  switch (membership) {
    case "reference":
      return "Reference";
    case "citing":
      return "Citing";
    case "recommended":
      return "Recommended";
  }
}

export function formatScore(score: number | null): string {
  return score === null ? "Unavailable" : score.toFixed(2);
}

export function formatYear(year: number | null): string {
  return year === null ? "Year unknown" : String(year);
}

export function formatCitations(count: number | null): string {
  return count === null ? "Citations unknown" : `${count} citations`;
}
