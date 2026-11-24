import { describe, expect, it } from "vitest";
import { buildNeighborhood } from "@/lib/graph/build";
import { makeNeighborhood, makePaper, branch, recommendationBranch, FIXED_NOW } from "../fixtures/graph";

describe("citation branch normalization", () => {
  it("turns references into center -> reference directed edges", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("ref-a"), makePaper("ref-b")],
    });
    const edges = neighborhood.edges.filter((edge) => edge.evidence === "references-endpoint");
    expect(edges).toHaveLength(2);
    for (const edge of edges) {
      expect(edge.source).toBe("center");
      expect(edge.kind).toBe("citation");
      expect(["ref-a", "ref-b"]).toContain(edge.target);
    }
    expect(neighborhood.nodes.find((node) => node.paper.id === "ref-a")?.memberships).toEqual(["reference"]);
  });

  it("turns citing papers into citing -> center directed edges", () => {
    const neighborhood = makeNeighborhood({
      citing: [makePaper("citer-a")],
    });
    expect(neighborhood.edges).toEqual([
      {
        id: "cit:citer-a->center",
        source: "citer-a",
        target: "center",
        kind: "citation",
        evidence: "citations-endpoint",
      },
    ]);
    expect(neighborhood.nodes.find((node) => node.paper.id === "citer-a")?.memberships).toEqual(["citing"]);
  });

  it("preserves both directions of a mutual citation pair", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("mutual")],
      citing: [makePaper("mutual")],
    });
    expect(neighborhood.edges).toHaveLength(2);
    expect(neighborhood.edges.some((edge) => edge.source === "center" && edge.target === "mutual")).toBe(true);
    expect(neighborhood.edges.some((edge) => edge.source === "mutual" && edge.target === "center")).toBe(true);
  });

  it("merges a paper appearing in all three branches into one node", () => {
    const overlap = makePaper("overlap");
    const neighborhood = makeNeighborhood({
      references: [overlap],
      citing: [overlap],
      recommended: [overlap],
    });
    const matches = neighborhood.nodes.filter((node) => node.paper.id === "overlap");
    expect(matches).toHaveLength(1);
    expect(matches[0].memberships).toEqual(["reference", "citing", "recommended"]);
    expect(matches[0].recommendationRank).toBe(1);
    expect(neighborhood.nodes).toHaveLength(2);
    expect(neighborhood.edges).toHaveLength(2);
    expect(neighborhood.recommendations).toHaveLength(1);
  });

  it("keeps recommendations separate from citation edges", () => {
    const neighborhood = makeNeighborhood({
      recommended: [makePaper("rec-a"), makePaper("rec-b")],
    });
    expect(neighborhood.edges).toHaveLength(0);
    expect(neighborhood.recommendations).toHaveLength(2);
    expect(neighborhood.recommendations[0]).toMatchObject({
      source: "center",
      target: "rec-a",
      kind: "recommendation",
      pool: "all-cs",
      rank: 1,
    });
    expect(neighborhood.nodes.find((node) => node.paper.id === "rec-a")?.memberships).toEqual(["recommended"]);
  });

  it("never infers edges between peripheral papers", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("ref-a"), makePaper("ref-b")],
      citing: [makePaper("cite-a")],
      recommended: [makePaper("rec-a")],
    });
    for (const edge of neighborhood.edges) {
      expect([edge.source, edge.target]).toContain("center");
    }
    expect(neighborhood.edges).toHaveLength(3);
  });

  it("removes self edges and center-as-neighbor duplicates", () => {
    const center = makePaper("center");
    const neighborhood = makeNeighborhood({
      center,
      references: [center, makePaper("ref-a")],
    });
    expect(neighborhood.nodes).toHaveLength(2);
    expect(neighborhood.edges).toHaveLength(1);
    expect(neighborhood.edges[0].source).toBe("center");
    expect(neighborhood.edges[0].target).toBe("ref-a");
    expect(neighborhood.warnings.join(" ")).toMatch(/duplicated the center paper/);
  });

  it("deduplicates repeated branch records and citation edges", () => {
    const duplicate = makePaper("ref-a");
    const neighborhood = makeNeighborhood({
      references: [duplicate, duplicate],
      referenceOptions: { receivedEntries: 2 },
    });
    expect(neighborhood.nodes.filter((node) => node.paper.id === "ref-a")).toHaveLength(1);
    expect(neighborhood.edges).toHaveLength(1);
    expect(neighborhood.coverage.references.receivedEntries).toBe(2);
    expect(neighborhood.coverage.references.validDistinctPapers).toBe(1);
  });

  it("keeps unknown citation counts distinct from a known zero", () => {
    const neighborhood = makeNeighborhood({
      references: [
        makePaper("unknown-count", { citationCount: null }),
        makePaper("zero-count", { citationCount: 0 }),
      ],
    });
    const unknown = neighborhood.nodes.find((node) => node.paper.id === "unknown-count")!;
    const zero = neighborhood.nodes.find((node) => node.paper.id === "zero-count")!;
    expect(unknown.paper.citationCount).toBeNull();
    expect(zero.paper.citationCount).toBe(0);
  });

  it("skips records without usable identifiers and reports counts", () => {
    const valid = makePaper("valid");
    const neighborhood = buildNeighborhood({
      center: makePaper("center"),
      references: branch([valid], { receivedEntries: 3, skippedEntries: 2 }),
      citing: branch([], { status: "empty" }),
      recommended: recommendationBranch([], { status: "unavailable", message: "No pool" }),
      mode: "synthetic-demo",
      provider: "synthetic-test",
      fetchedAt: FIXED_NOW,
      recommendationPool: "all-cs",
      similarityComputedAt: FIXED_NOW,
    });
    expect(neighborhood.nodes).toHaveLength(2);
    expect(neighborhood.coverage.references).toMatchObject({
      status: "ok",
      receivedEntries: 3,
      validDistinctPapers: 1,
      skippedEntries: 2,
      nextOffset: null,
    });
    expect(neighborhood.coverage.citing.status).toBe("empty");
    expect(neighborhood.coverage.recommended.status).toBe("unavailable");
    expect(neighborhood.warnings.join(" ")).toMatch(/2 references entries lacked/);
    expect(neighborhood.warnings.join(" ")).toMatch(/Recommendations are unavailable/);
  });

  it("keeps a failed branch distinct from a genuinely empty branch", () => {
    const failed = makeNeighborhood({
      references: [],
      referenceOptions: { status: "error", message: "Upstream 500" },
    });
    const empty = makeNeighborhood({ references: [] });
    expect(failed.coverage.references.status).toBe("error");
    expect(failed.coverage.references.message).toBe("Upstream 500");
    expect(failed.warnings.join(" ")).toMatch(/failed branch, not an empty result/);
    expect(empty.coverage.references.status).toBe("empty");
    expect(empty.warnings.join(" ")).not.toMatch(/failed branch/);
  });

  it("uses central metadata first and deterministic branch priority", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("dup", { title: "Reference title" })],
      recommended: [makePaper("dup", { title: "Recommendation title" })],
    });
    const node = neighborhood.nodes.find((item) => item.paper.id === "dup")!;
    expect(node.paper.title).toBe("Reference title");
    expect(node.memberships).toEqual(["reference", "recommended"]);
  });

  it("shows a fallback title for a known ID with missing title", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("no-title", { title: "" })],
    });
    expect(neighborhood.nodes.find((node) => node.paper.id === "no-title")?.paper.title).toBe("Title unavailable.");
  });

  it("normalizes negative and non-finite counts to null while preserving zero", () => {
    const neighborhood = makeNeighborhood({
      references: [
        makePaper("negative", { citationCount: -5 }),
        makePaper("infinite", { citationCount: Number.POSITIVE_INFINITY }),
        makePaper("zero", { citationCount: 0 }),
      ],
    });
    expect(neighborhood.nodes.find((node) => node.paper.id === "negative")?.paper.citationCount).toBeNull();
    expect(neighborhood.nodes.find((node) => node.paper.id === "infinite")?.paper.citationCount).toBeNull();
    expect(neighborhood.nodes.find((node) => node.paper.id === "zero")?.paper.citationCount).toBe(0);
  });

  it("stores coverage and similarity provenance", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("ref-a")],
    });
    expect(neighborhood.coverage.references.requestedLimit).toBe(40);
    expect(neighborhood.similarity.algorithm).toBe("tfidf-cosine");
    expect(neighborhood.similarity.corpusIds).toContain("center");
    expect(neighborhood.similarity.corpusIds).toContain("ref-a");
    expect(neighborhood.similarity.computedAt).toBe(FIXED_NOW);
  });
});
