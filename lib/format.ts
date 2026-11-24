import type { Paper, SimilarityCoverage } from "@/lib/types";

export function formatAuthors(
  paper: Paper,
  options: { limit?: number } = {},
): string {
  const names = paper.authors.map((author) => author.name);
  if (names.length === 0) return "Authors unavailable";
  const limit = options.limit;
  if (limit && names.length > limit) {
    return `${names.slice(0, limit).join(", ")} +${names.length - limit} more`;
  }
  return names.join(", ");
}

export function formatCount(value: number | null, noun: string): string {
  return value === null ? "Unknown" : `${value.toLocaleString()} ${noun}`;
}

export function formatSimilarity(
  value: number | null,
  coverage: SimilarityCoverage,
): string {
  if (value === null) return "Unavailable";
  const score = value.toFixed(3);
  return coverage === "title-only" ? `${score} (title only)` : score;
}

export function similarityCoverageLabel(coverage: SimilarityCoverage): string {
  switch (coverage) {
    case "title+abstract":
      return "Title + abstract";
    case "title-only":
      return "Title only";
    case "unavailable":
      return "Unavailable";
  }
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export interface SourceLink {
  label: string;
  href: string;
}

function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function paperSourceLinks(paper: Paper): SourceLink[] {
  const links: SourceLink[] = [];
  const web = safeUrl(paper.url);
  if (web) links.push({ label: "View source", href: web });
  if (paper.externalIds.DOI) {
    const doi = paper.externalIds.DOI.split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    links.push({ label: "Open DOI", href: `https://doi.org/${doi}` });
  }
  if (paper.externalIds.ArXiv) {
    links.push({
      label: "Open arXiv",
      href: `https://arxiv.org/abs/${encodeURIComponent(
        paper.externalIds.ArXiv,
      )}`,
    });
  }
  return links;
}

export function shortAuthors(paper: Paper): string {
  const names = paper.authors.map((author) => author.name);
  if (names.length === 0) return "Authors unavailable";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
