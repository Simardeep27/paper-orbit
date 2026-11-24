import type { Paper } from "@/lib/types";

export interface CatalogEntry {
  paper: Paper;
  hasNeighborhood: boolean;
}

function queryTerms(query: string): string[] {
  return query
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 2);
}

/** Deterministic local relevance for offline catalogs; never an API score. */
export function catalogRelevance(paper: Paper, rawQuery: string): number {
  const query = rawQuery.normalize("NFKC").toLowerCase().trim();
  if (!query) return 0;
  if (paper.id.toLowerCase() === query) return 1000;
  const title = paper.title.toLowerCase();
  const authors = paper.authors.map((author) => author.name.toLowerCase());
  const venue = paper.venue?.toLowerCase() ?? "";
  const abstract = paper.abstract?.toLowerCase() ?? "";
  let score = 0;
  if (title === query) score += 200;
  else if (title.startsWith(query)) score += 120;
  else if (title.includes(query)) score += 80;
  for (const term of queryTerms(query)) {
    if (title.includes(term)) score += 12;
    else if (abstract.includes(term)) score += 4;
    if (authors.some((author) => author.includes(term))) score += 8;
    if (venue.includes(term)) score += 5;
    if (paper.year !== null && String(paper.year) === term) score += 6;
  }
  return score;
}

export function searchCatalog(
  catalog: CatalogEntry[],
  query: string,
  offset: number,
  limit: number,
): { papers: Paper[]; nextOffset: number | null } {
  const ranked = catalog
    .map((entry) => ({
      ...entry,
      score: catalogRelevance(entry.paper, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.paper.year !== b.paper.year) {
        if (a.paper.year === null) return 1;
        if (b.paper.year === null) return -1;
        return b.paper.year - a.paper.year;
      }
      return a.paper.title.localeCompare(b.paper.title);
    });
  const page = ranked.slice(offset, offset + limit);
  return {
    papers: page.map((entry) => entry.paper),
    nextOffset: offset + limit < ranked.length ? offset + limit : null,
  };
}
