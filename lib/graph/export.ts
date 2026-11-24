import type { Neighborhood, SavedPaper } from "@/lib/types";
import { makeExportProvenance } from "@/lib/state/persistence";

export function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}[\]<>#|])/g, "\\$1")
    .replace(/\r?\n/g, " ");
}

function markdownNote(note: string): string {
  const lines = note.replace(/\r\n/g, "\n").split("\n");
  return lines
    .map((line) => `> ${escapeMarkdown(line)}`.trimEnd())
    .join("\n");
}

function linkFor(item: SavedPaper): string | null {
  const doi = item.paper.externalIds.DOI;
  if (doi) return `https://doi.org/${doi}`;
  const arxiv = item.paper.externalIds.ArXiv;
  if (arxiv) return `https://arxiv.org/abs/${arxiv}`;
  return item.paper.url;
}

export function buildReadingListMarkdown(
  items: SavedPaper[],
  neighborhood: Neighborhood | null,
): string {
  const provenance = makeExportProvenance(neighborhood);
  const lines: string[] = [
    "# Paper Orbit reading list",
    "",
    `Exported: ${provenance.exportedAt}`,
    `Items: ${items.length}`,
    `Similarity method: ${provenance.similarityAlgorithm} (v${provenance.similarityVersion})`,
    "",
    "> Paper Orbit is a local exploration prototype. Citation and recommendation samples are not a complete graph, and citation counts are not quality ratings.",
    "",
  ];

  if (items.length === 0) {
    lines.push("_No saved papers._", "");
    return lines.join("\n");
  }

  items.forEach((item, index) => {
    const paper = item.paper;
    lines.push(`## ${index + 1}. ${escapeMarkdown(paper.title)}`, "");
    lines.push(
      `- Authors: ${
        paper.authors.length
          ? paper.authors.map((author) => escapeMarkdown(author.name)).join(", ")
          : "Unknown"
      }`,
    );
    lines.push(`- Year: ${paper.year ?? "Unknown"}`);
    lines.push(
      `- Venue: ${paper.venue ? escapeMarkdown(paper.venue) : "Unknown"}`,
    );
    lines.push(
      `- Provider citation count: ${
        paper.citationCount === null ? "Unknown" : paper.citationCount
      }`,
    );
    lines.push(
      `- Saved: ${item.savedAt}${
        item.sourceCenterTitle
          ? ` from center ${escapeMarkdown(item.sourceCenterTitle)}`
          : ""
      }`,
    );
    const link = linkFor(item);
    if (link) lines.push(`- Source: ${link}`);
    if (item.note.trim()) {
      lines.push("- Note:", "", markdownNote(item.note.trim()));
    }
    lines.push("");
  });

  lines.push(
    "---",
    "",
    `Export provenance: ${provenance.source}. Only saved papers are included.`,
    "",
  );
  return lines.join("\n");
}

export interface ReadingListExport {
  version: 1;
  exportedAt: string;
  provenance: {
    app: "Paper Orbit";
    similarityAlgorithm: string;
    similarityVersion: string;
    source: string;
    note: string;
  };
  items: SavedPaper[];
}

export function readingListToExport(
  items: SavedPaper[],
  neighborhood: Neighborhood | null,
): ReadingListExport {
  const provenance = makeExportProvenance(neighborhood);
  return {
    version: 1,
    exportedAt: provenance.exportedAt,
    provenance: {
      app: provenance.app,
      similarityAlgorithm: provenance.similarityAlgorithm,
      similarityVersion: provenance.similarityVersion,
      source: provenance.source,
      note:
        "Only user-saved papers are included. Citation relationships and recommendation ranks were sampled per loaded neighborhood and are not a complete graph.",
    },
    items,
  };
}

export function sanitizeFilename(value: string, fallback = "paper-orbit"): string {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .toLowerCase();
  return sanitized && !/^\.+$/.test(sanitized) ? sanitized : fallback;
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(
  text: string,
  filename: string,
  type = "text/plain;charset=utf-8",
): void {
  downloadBlob(new Blob([text], { type }), filename);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (typeof document === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

const INLINE_STYLE_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
] as const;

/** Clones an SVG with computed inline styles for standalone download. */
export function standaloneSvg(source: SVGSVGElement): string {
  const clone = source.cloneNode(true) as SVGSVGElement;
  const sourceElements = [source, ...source.querySelectorAll("*")];
  const cloneElements = [clone, ...clone.querySelectorAll("*")];
  sourceElements.forEach((element, index) => {
    const target = cloneElements[index] as SVGElement | undefined;
    if (!target) return;
    const computed = window.getComputedStyle(element);
    const declarations = INLINE_STYLE_PROPERTIES.map((property) => {
      const value = computed.getPropertyValue(property);
      return value ? `${property}:${value}` : "";
    })
      .filter(Boolean)
      .join(";");
    if (declarations) target.setAttribute("style", declarations);
    target.removeAttribute("class");
  });
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

export function downloadSvg(source: SVGSVGElement, filename: string): void {
  downloadText(
    standaloneSvg(source),
    filename.endsWith(".svg") ? filename : `${filename}.svg`,
    "image/svg+xml;charset=utf-8",
  );
}
