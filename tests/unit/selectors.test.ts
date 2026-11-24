import { describe, expect, it } from "vitest";
import {
  countMemberships,
  getCenterNode,
  getNeighborNodes,
  getVisibleNeighborhood,
  getYearHistogram,
  hasActiveFilters,
  isCenterAvailableOffline,
  nodeMatchesFilters,
  sortNeighborNodes,
} from "@/lib/graph/selectors";
import { DEFAULT_FILTERS, type Filters } from "@/lib/types";
import { makeNeighborhood, makePaper, yearNeighborhood } from "../fixtures/graph";

function filters(patch: Partial<Filters>): Filters {
  return {
    ...DEFAULT_FILTERS,
    relationships: [...DEFAULT_FILTERS.relationships],
    ...patch,
  };
}

describe("coordinated filters and selectors", () => {
  it("uses inclusive year bounds and keeps the center separate", () => {
    const neighborhood = yearNeighborhood();
    const visible = getVisibleNeighborhood(
      neighborhood,
      filters({
        yearStart: 2005,
        yearEnd: 2020,
        includeUnknownYear: false,
      }),
    );
    expect(visible.neighbors.map((node) => node.paper.id).sort()).toEqual(
      ["new", "rec-a", "rec-b", "same"].sort(),
    );
    expect(visible.center?.paper.id).toBe("center");
    expect(visible.nodes[0].paper.id).toBe("center");
    expect(visible.visibleIds.has("center")).toBe(true);
  });

  it("explicitly includes or excludes unknown years", () => {
    const neighborhood = yearNeighborhood();
    const withUnknown = getVisibleNeighborhood(
      neighborhood,
      filters({ yearStart: 2000, yearEnd: 2020, includeUnknownYear: true }),
    );
    const withoutUnknown = getVisibleNeighborhood(
      neighborhood,
      filters({ yearStart: 2000, yearEnd: 2020, includeUnknownYear: false }),
    );
    expect(withUnknown.neighbors.some((node) => node.paper.id === "unknown-year")).toBe(true);
    expect(withoutUnknown.neighbors.some((node) => node.paper.id === "unknown-year")).toBe(false);
  });

  it("ORs relationship memberships and shows zero neighbors when none are selected", () => {
    const neighborhood = yearNeighborhood();
    const references = getVisibleNeighborhood(
      neighborhood,
      filters({ relationships: ["reference"] }),
    );
    expect(references.neighbors.every((node) => node.memberships.includes("reference"))).toBe(true);
    const citing = getVisibleNeighborhood(
      neighborhood,
      filters({ relationships: ["citing"] }),
    );
    expect(citing.neighbors.map((node) => node.paper.id)).toEqual(["later"]);
    const both = getVisibleNeighborhood(
      neighborhood,
      filters({ relationships: ["reference", "citing"] }),
    );
    expect(both.neighbors.length).toBe(5);
    const none = getVisibleNeighborhood(
      neighborhood,
      filters({ relationships: [] }),
    );
    expect(none.neighbors).toHaveLength(0);
    expect(none.nodes.map((node) => node.paper.id)).toEqual(["center"]);
    expect(none.edges).toHaveLength(0);
  });

  it("ANDs year, citation, similarity, and text filters", () => {
    const neighborhood = yearNeighborhood();
    const visible = getVisibleNeighborhood(
      neighborhood,
      filters({
        yearStart: 2000,
        yearEnd: 2020,
        includeUnknownYear: false,
        minCitations: 2,
        includeUnknownCitations: false,
        minSimilarity: 0,
        includeUnavailableSimilarity: false,
        text: "citation",
      }),
    );
    expect(visible.neighbors.map((node) => node.paper.id).sort()).toEqual(
      ["rec-b", "same"].sort(),
    );
  });

  it("treats unknown citation counts as an explicit option", () => {
    const neighborhood = yearNeighborhood();
    const withUnknown = getVisibleNeighborhood(
      neighborhood,
      filters({ minCitations: 5, includeUnknownCitations: true }),
    );
    const withoutUnknown = getVisibleNeighborhood(
      neighborhood,
      filters({ minCitations: 5, includeUnknownCitations: false }),
    );
    expect(withUnknown.neighbors.some((node) => node.paper.id === "new")).toBe(true);
    expect(withoutUnknown.neighbors.some((node) => node.paper.id === "new")).toBe(false);
    expect(withoutUnknown.neighbors.some((node) => node.paper.id === "unknown-year")).toBe(true);
  });

  it("treats unavailable similarity as an explicit option, not zero", () => {
    const neighborhood = makeNeighborhood({
      references: [
        makePaper("scored", { title: "Citation visualization", abstract: "nets" }),
        makePaper("unscored", { title: "Title unavailable.", abstract: null }),
      ],
    });
    const node = neighborhood.nodes.find((item) => item.paper.id === "unscored")!;
    expect(node.textSimilarity).toBeNull();
    const withUnknown = getVisibleNeighborhood(
      neighborhood,
      filters({ minSimilarity: 0.1, includeUnavailableSimilarity: true }),
    );
    const withoutUnknown = getVisibleNeighborhood(
      neighborhood,
      filters({ minSimilarity: 0.1, includeUnavailableSimilarity: false }),
    );
    expect(withUnknown.neighbors.some((item) => item.paper.id === "unscored")).toBe(true);
    expect(withoutUnknown.neighbors.some((item) => item.paper.id === "unscored")).toBe(false);
  });

  it("matches local text against titles, authors, and venue without an upstream call", () => {
    const neighborhood = makeNeighborhood({
      references: [
        makePaper("alpha", { title: "Orbital reading", authors: [{ id: null, name: "Ada Lovelace" }], venue: "Venue One" }),
        makePaper("beta", { title: "Citation lists", authors: [{ id: null, name: "Grace Hopper" }], venue: "Venue Two" }),
      ],
    });
    expect(nodeMatchesFilters(neighborhood.nodes.find((node) => node.paper.id === "alpha")!, filters({ text: "orbital" }))).toBe(true);
    expect(nodeMatchesFilters(neighborhood.nodes.find((node) => node.paper.id === "beta")!, filters({ text: "ada" }))).toBe(false);
    expect(nodeMatchesFilters(neighborhood.nodes.find((node) => node.paper.id === "beta")!, filters({ text: "venue two" }))).toBe(true);
  });

  it("keeps only edges whose endpoints are visible", () => {
    const neighborhood = yearNeighborhood();
    const visible = getVisibleNeighborhood(
      neighborhood,
      filters({ relationships: ["reference"] }),
    );
    for (const edge of visible.edges) {
      expect(visible.visibleIds.has(edge.source)).toBe(true);
      expect(visible.visibleIds.has(edge.target)).toBe(true);
    }
    expect(visible.edges).toHaveLength(4);
  });

  it("computes histogram context without its own year filter and excludes the center", () => {
    const neighborhood = yearNeighborhood();
    const histogram = getYearHistogram(
      neighborhood,
      filters({
        yearStart: 2020,
        yearEnd: 2020,
        includeUnknownYear: false,
        relationships: ["reference", "citing", "recommended"],
      }),
    );
    expect(histogram.contextTotal).toBe(7);
    expect(histogram.visibleTotal).toBe(1);
    expect(histogram.unknown.context).toBe(1);
    expect(histogram.unknown.visible).toBe(0);
    expect(histogram.bins.find((bin) => bin.year === 1999)).toMatchObject({
      context: 1,
      visible: 0,
    });
    expect(histogram.bins.find((bin) => bin.year === 2020)).toMatchObject({
      context: 1,
      visible: 1,
    });
    expect(histogram.bins.some((bin) => bin.year === 2010)).toBe(false);
    expect(histogram.domain).toEqual([1999, 2024]);
  });

  it("applies relationship and citation filters to histogram context", () => {
    const neighborhood = yearNeighborhood();
    const histogram = getYearHistogram(
      neighborhood,
      filters({
        relationships: ["citing"],
        minCitations: 0,
        yearStart: 2000,
        yearEnd: 2001,
      }),
    );
    expect(histogram.contextTotal).toBe(1);
    expect(histogram.visibleTotal).toBe(0);
    expect(histogram.bins.find((bin) => bin.year === 2024)).toMatchObject({
      context: 1,
      visible: 0,
    });
  });

  it("sorts nulls last with deterministic title and ID ties", () => {
    const neighborhood = makeNeighborhood({
      references: [
        makePaper("no-count", { title: "Same title", citationCount: null, year: null }),
        makePaper("count-b", { title: "Same title", citationCount: 4, year: 2001 }),
        makePaper("count-a", { title: "Same title", citationCount: 4, year: 2001 }),
        makePaper("zero", { title: "A title", citationCount: 0, year: 1999 }),
      ],
    });
    const nodes = getNeighborNodes(neighborhood);
    const sorted = sortNeighborNodes(nodes, "citations");
    expect(sorted.map((node) => node.paper.id)).toEqual(["count-a", "count-b", "zero", "no-count"]);
    expect(sortNeighborNodes(nodes, "newest").at(-1)?.paper.id).toBe("no-count");
    expect(sortNeighborNodes(nodes, "oldest").at(-1)?.paper.id).toBe("no-count");
  });

  it("sorts recommendation rank and leaves non-recommendations last", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("ref")],
      recommended: [makePaper("rec-2"), makePaper("rec-1")],
    });
    const sorted = sortNeighborNodes(getNeighborNodes(neighborhood), "recommendation");
    expect(sorted.map((node) => node.paper.id)).toEqual(["rec-2", "rec-1", "ref"]);
  });

  it("counts overlapping memberships in each relationship", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("all")],
      citing: [makePaper("all")],
      recommended: [makePaper("all")],
    });
    expect(countMemberships(getNeighborNodes(neighborhood))).toEqual({
      reference: 1,
      citing: 1,
      recommended: 1,
    });
    expect(getCenterNode(neighborhood)?.memberships).toEqual([]);
  });

  it("detects active filters and offline center availability", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters(filters({ text: "graph" }))).toBe(true);
    expect(hasActiveFilters(filters({ relationships: [] }))).toBe(true);
    const neighborhood = makeNeighborhood();
    expect(isCenterAvailableOffline(neighborhood, "center")).toBe(true);
    expect(isCenterAvailableOffline(neighborhood, "other")).toBe(false);
  });
});
