import { describe, expect, it } from "vitest";
import {
  buildSceneModel,
  createCitationSizeScale,
  deterministicDirection,
  radiusForNode,
  svgRadiusForCount,
} from "@/lib/graph/layout";
import { getVisibleNeighborhood } from "@/lib/graph/selectors";
import { DEFAULT_FILTERS } from "@/lib/types";
import { makeNeighborhood, makePaper } from "../fixtures/graph";

describe("spherical and radial layout", () => {
  it("places the center at the origin and derives stable unit directions", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("a"), makePaper("b")],
    });
    const scene = buildSceneModel(neighborhood, "similarity-radius");
    expect(scene.positions.get("center")).toMatchObject({ x: 0, y: 0, z: 0, radius: 0 });
    const first = deterministicDirection("a");
    const second = deterministicDirection("a");
    expect(first).toEqual(second);
    expect(Math.hypot(first.x, first.y, first.z)).toBeCloseTo(1, 10);
    expect(deterministicDirection("b")).not.toEqual(first);
  });

  it("uses radius 3 + 7 * (1 - similarity), monotonically", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("high"), makePaper("low")],
    });
    const high = neighborhood.nodes.find((node) => node.paper.id === "high")!;
    const low = neighborhood.nodes.find((node) => node.paper.id === "low")!;
    high.textSimilarity = 0.9;
    low.textSimilarity = 0.2;
    expect(radiusForNode(high, "similarity-radius")).toBeCloseTo(3.7, 10);
    expect(radiusForNode(low, "similarity-radius")).toBeCloseTo(8.6, 10);
    expect(radiusForNode(high, "similarity-radius")).toBeLessThan(
      radiusForNode(low, "similarity-radius"),
    );
  });

  it("places unknown similarity on a visible outer shell", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("unknown")],
    });
    const node = neighborhood.nodes.find((item) => item.paper.id === "unknown")!;
    node.textSimilarity = null;
    expect(radiusForNode(node, "similarity-radius")).toBe(11.5);
    expect(radiusForNode(node, "even-shell")).toBe(8);
  });

  it("is deterministic across repeated scene construction", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("a"), makePaper("b")],
      citing: [makePaper("c")],
      recommended: [makePaper("d")],
    });
    const first = buildSceneModel(neighborhood, "similarity-radius");
    const second = buildSceneModel(neighborhood, "similarity-radius");
    expect([...first.positions.entries()]).toEqual([...second.positions.entries()]);
  });

  it("does not relayout when filters hide nodes", () => {
    const neighborhood = makeNeighborhood({
      references: [makePaper("a", { year: 2000 }), makePaper("b", { year: 2020 })],
    });
    const before = buildSceneModel(neighborhood, "similarity-radius");
    const filtered = getVisibleNeighborhood(neighborhood, {
      ...DEFAULT_FILTERS,
      yearStart: 2010,
      yearEnd: 2030,
    });
    expect(filtered.visibleIds.has("a")).toBe(false);
    const after = buildSceneModel(neighborhood, "similarity-radius");
    expect([...after.positions.entries()]).toEqual([...before.positions.entries()]);
  });

  it("log-scales citation counts into a bounded radius range", () => {
    const scene = {
      layout: "similarity-radius" as const,
      positions: new Map(),
      minSimilarity: null,
      maxSimilarity: null,
      citationMin: 0,
      citationMax: 1000,
    };
    const scale = createCitationSizeScale(scene);
    expect(scale.radiusFor(null)).toBeNull();
    expect(scale.radiusFor(0)).toBeCloseTo(0.1, 10);
    expect(scale.radiusFor(1000)).toBeCloseTo(0.28, 10);
    expect(scale.radiusFor(10)!).toBeGreaterThan(scale.radiusFor(1)!);
    expect(svgRadiusForCount(null, scale)).toBeGreaterThan(0);
  });

  it("uses a frozen mid-range size when all known counts are equal", () => {
    const scene = {
      layout: "even-shell" as const,
      positions: new Map(),
      minSimilarity: null,
      maxSimilarity: null,
      citationMin: 5,
      citationMax: 5,
    };
    const scale = createCitationSizeScale(scene);
    expect(scale.radiusFor(5)).toBe(0.17);
  });
});
