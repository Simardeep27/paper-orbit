import { describe, expect, it } from "vitest";
import {
  computeSimilarity,
  documentText,
  tokenize,
} from "@/lib/graph/similarity";
import { makePaper } from "../fixtures/graph";

describe("local text similarity", () => {
  it("gives identical documents a cosine near 1", () => {
    const text = {
      title: "Citation neighborhood visualization",
      abstract: "We visualize references, citing papers, and recommendations.",
    };
    const result = computeSimilarity(
      makePaper("center", text),
      [makePaper("same", text)],
    );
    expect(result.scores.get("same")?.score).toBeCloseTo(1, 10);
    expect(result.scores.get("same")?.coverage).toBe("title+abstract");
  });

  it("gives disjoint vocabulary a score of 0", () => {
    const result = computeSimilarity(
      makePaper("center", {
        title: "citation network",
        abstract: "references and arrows",
      }),
      [
        makePaper("other", {
          title: "protein folding",
          abstract: "molecular dynamics simulation",
        }),
      ],
    );
    expect(result.scores.get("other")?.score).toBe(0);
  });

  it("returns null for empty vectors instead of inventing a score", () => {
    const result = computeSimilarity(
      makePaper("center", {
        title: "Title unavailable.",
        abstract: null,
      }),
      [
        makePaper("other", {
          title: "Title unavailable.",
          abstract: null,
        }),
      ],
    );
    expect(result.scores.get("other")?.score).toBeNull();
    expect(result.scores.get("other")?.coverage).toBe("unavailable");
  });

  it("labels pair coverage title-only when either abstract is missing", () => {
    const result = computeSimilarity(
      makePaper("center", { abstract: "Shared citation vocabulary." }),
      [makePaper("other", { abstract: null })],
    );
    expect(result.scores.get("other")?.coverage).toBe("title-only");
  });

  it("is invariant to letter case and compatible Unicode forms", () => {
    const composed = computeSimilarity(
      makePaper("center", {
        title: "Café citation networks",
        abstract: null,
      }),
      [
        makePaper("other", {
          title: "CAFE\u0301 CITATION NETWORKS",
          abstract: null,
        }),
      ],
    );
    expect(composed.scores.get("other")?.score).toBeCloseTo(1, 10);
  });

  it("removes stopwords and one-character tokens but keeps short technical terms", () => {
    expect(tokenize("The AI and ML of a graph")).toEqual(["ai", "ml", "graph"]);
  });

  it("repeats the title for modest extra weight", () => {
    const paper = makePaper("p", {
      title: "orbit",
      abstract: "orbit",
    });
    expect(documentText(paper).trim().split(/\s+/)).toEqual([
      "orbit",
      "orbit",
      "orbit",
    ]);
  });

  it("excludes the center from neighbor rankings but keeps it in the corpus", () => {
    const result = computeSimilarity(
      makePaper("center", { title: "citation graph", abstract: null }),
      [makePaper("other", { title: "citation list", abstract: null })],
    );
    expect(result.scores.get("center")?.score).toBeNull();
    expect(result.meta.corpusIds).toEqual(["center", "other"]);
    expect(result.scores.get("other")?.score).toBeGreaterThan(0);
    expect(result.scores.get("other")?.score).toBeLessThanOrEqual(1);
  });

  it("is deterministic for the same corpus", () => {
    const center = makePaper("center", { title: "citation graph", abstract: "papers" });
    const neighbors = [
      makePaper("b", { title: "paper graph", abstract: null }),
      makePaper("a", { title: "citation list", abstract: "papers" }),
    ];
    const first = computeSimilarity(center, neighbors);
    const second = computeSimilarity(center, [...neighbors].reverse());
    expect(first.scores.get("a")?.score).toBe(second.scores.get("a")?.score);
    expect(first.scores.get("b")?.score).toBe(second.scores.get("b")?.score);
  });
});
