import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExplorerStore } from "@/lib/state/explorer";
import { buildNeighborhood } from "@/lib/graph/build";
import { DEFAULT_FILTERS, type Neighborhood } from "@/lib/types";
import {
  branch,
  recommendationBranch,
  FIXED_NOW,
  makePaper,
} from "../fixtures/graph";

const centers = {
  A: "center-a",
  B: "center-b",
  C: "center-c",
  D: "center-d",
};

function neighborhood(
  centerId: string,
  options: {
    references?: string[];
    citing?: string[];
    recommended?: string[];
  } = {},
): Neighborhood {
  const availableCenterIds = [centers.A, centers.B, centers.C];
  const name = centerId.replace("center-", "").toUpperCase();
  return buildNeighborhood({
    center: makePaper(centerId, { title: `Center ${name}` }),
    references: branch(
      (options.references ?? []).map((id) =>
        makePaper(id, { title: `Paper ${id}`, citationCount: 4 }),
      ),
    ),
    citing: branch(
      (options.citing ?? []).map((id) =>
        makePaper(id, { title: `Paper ${id}`, citationCount: 2 }),
      ),
    ),
    recommended: recommendationBranch(
      (options.recommended ?? []).map((id) =>
        makePaper(id, { title: `Paper ${id}`, citationCount: null }),
      ),
    ),
    mode: "synthetic-demo",
    provider: "synthetic-test",
    fetchedAt: FIXED_NOW,
    recommendationPool: "all-cs",
    similarityComputedAt: FIXED_NOW,
    warnings: [],
    demo: {
      availableCenterIds,
      notice: "Store test fixture",
    },
  });
}

function resetStore() {
  const initial = useExplorerStore.getInitialState();
  useExplorerStore.setState(
    {
      ...initial,
      filters: {
        ...DEFAULT_FILTERS,
        relationships: [...DEFAULT_FILTERS.relationships],
      },
      compareIds: [],
      comparePapers: {},
      history: [],
      historyIndex: -1,
      neighborhood: null,
      centerId: null,
      selectedPaperId: null,
      status: "idle",
      error: null,
      errorCode: null,
      loadingCenterId: null,
      sourceMode: "demo",
      neighborhoodCache: {},
    },
    true,
  );
}

function responseFor(neighborhoodValue: Neighborhood): Response {
  return new Response(JSON.stringify(neighborhoodValue), { status: 200 });
}

describe("explorer store navigation transactions", () => {
  beforeEach(() => {
    resetStore();
    window.history.replaceState(null, "", "/explore");
  });

  it("loads a neighborhood, selects the center, and records history", async () => {
    const value = neighborhood(centers.A, {
      references: [centers.B],
      recommended: [centers.C],
    });
    const fetchMock = vi.fn().mockResolvedValue(responseFor(value));
    vi.stubGlobal("fetch", fetchMock);
    await useExplorerStore
      .getState()
      .loadCenter(centers.A, { mode: "demo", historyMode: "replace" });
    const state = useExplorerStore.getState();
    expect(state.centerId).toBe(centers.A);
    expect(state.selectedPaperId).toBe(centers.A);
    expect(state.status).toBe("ready");
    expect(state.history).toHaveLength(1);
    expect(state.historyIndex).toBe(0);
    expect(state.neighborhood?.nodes).toHaveLength(3);
    expect(window.location.search).toContain("center=center-a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("keeps the newer center when an older response resolves late", async () => {
    const a = neighborhood(centers.A, { references: [centers.B] });
    const b = neighborhood(centers.B, { citing: [centers.A] });
    const resolvers: Record<string, (response: Response) => void> = {};
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const paperId = url.searchParams.get("paperId") ?? "";
      return new Promise<Response>((resolve) => {
        resolvers[paperId] = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = useExplorerStore
      .getState()
      .loadCenter(centers.A, { mode: "demo", historyMode: "replace" });
    const second = useExplorerStore
      .getState()
      .loadCenter(centers.B, { mode: "demo", historyMode: "push" });
    resolvers[centers.B](responseFor(b));
    await second;
    expect(useExplorerStore.getState().centerId).toBe(centers.B);
    resolvers[centers.A](responseFor(a));
    await first;
    expect(useExplorerStore.getState().centerId).toBe(centers.B);
    expect(useExplorerStore.getState().neighborhood?.centerId).toBe(centers.B);
    vi.unstubAllGlobals();
  });

  it("preserves the old graph when a recenter request fails", async () => {
    const a = neighborhood(centers.A, { references: [centers.B] });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(responseFor(a))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    await useExplorerStore
      .getState()
      .loadCenter(centers.A, { mode: "demo", historyMode: "replace" });
    await useExplorerStore
      .getState()
      .loadCenter(centers.B, { mode: "demo", historyMode: "push" });
    const state = useExplorerStore.getState();
    expect(state.centerId).toBe(centers.A);
    expect(state.neighborhood?.centerId).toBe(centers.A);
    expect(state.status).toBe("partial");
    expect(state.error).toBeTruthy();
    expect(state.history).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("blocks recentering to a catalog-only demo paper before fetching", async () => {
    const a = neighborhood(centers.A, { references: [centers.B] });
    const fetchMock = vi.fn().mockResolvedValue(responseFor(a));
    vi.stubGlobal("fetch", fetchMock);
    await useExplorerStore
      .getState()
      .loadCenter(centers.A, { mode: "demo", historyMode: "replace" });
    await useExplorerStore
      .getState()
      .loadCenter("catalog-only", { mode: "demo", historyMode: "push" });
    const state = useExplorerStore.getState();
    expect(state.centerId).toBe(centers.A);
    expect(state.errorCode).toBe("DEMO_CENTER_UNAVAILABLE");
    expect(state.error).toMatch(/not included in the offline demo/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("restores a cached neighborhood when history moves back", async () => {
    const a = neighborhood(centers.A, { references: [centers.B] });
    const b = neighborhood(centers.B, { citing: [centers.A] });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const paperId = url.searchParams.get("paperId");
      return Promise.resolve(
        responseFor(paperId === centers.B ? b : a),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    await useExplorerStore
      .getState()
      .loadCenter(centers.A, { mode: "demo", historyMode: "replace" });
    await useExplorerStore
      .getState()
      .loadCenter(centers.B, { mode: "demo", historyMode: "push" });
    expect(useExplorerStore.getState().historyIndex).toBe(1);
    await useExplorerStore.getState().loadCenter(centers.A, {
      mode: "demo",
      historyMode: "none",
      historyIndex: 0,
      filters: DEFAULT_FILTERS,
    });
    const state = useExplorerStore.getState();
    expect(state.centerId).toBe(centers.A);
    expect(state.historyIndex).toBe(0);
    // Cached restore should not issue another network request.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("clears a hidden selection and keeps scores frozen under filters", async () => {
    const a = neighborhood(centers.A, {
      references: [centers.B],
      citing: [centers.C],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responseFor(a)));
    await useExplorerStore
      .getState()
      .loadCenter(centers.A, { mode: "demo", historyMode: "replace" });
    const before = useExplorerStore.getState().neighborhood!;
    const scoreBefore = before.nodes.find((node) => node.paper.id === centers.B)
      ?.textSimilarity;
    useExplorerStore.getState().selectPaper(centers.B);
    useExplorerStore.getState().setFilters({ relationships: ["citing"] });
    const after = useExplorerStore.getState();
    expect(after.selectedPaperId).toBeNull();
    expect(after.announcement).toMatch(/hidden by the current filters/);
    expect(
      after.neighborhood?.nodes.find((node) => node.paper.id === centers.B)
        ?.textSimilarity,
    ).toBe(scoreBefore);
    vi.unstubAllGlobals();
  });

  it("limits comparison to two papers and replaces the oldest", async () => {
    const a = neighborhood(centers.A, {
      references: [centers.B],
      recommended: [centers.C, centers.D],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responseFor(a)));
    await useExplorerStore
      .getState()
      .loadCenter(centers.A, { mode: "demo", historyMode: "replace" });
    useExplorerStore.getState().toggleCompare(centers.B);
    useExplorerStore.getState().toggleCompare(centers.C);
    useExplorerStore.getState().toggleCompare(centers.D);
    const state = useExplorerStore.getState();
    expect(state.compareIds).toEqual([centers.C, centers.D]);
    expect(Object.keys(state.comparePapers).sort()).toEqual(
      [centers.C, centers.D].sort(),
    );
    useExplorerStore.getState().toggleCompare(centers.D);
    expect(useExplorerStore.getState().compareIds).toEqual([centers.C]);
    vi.unstubAllGlobals();
  });

  it("switches to 2D after a WebGL failure and can retry", () => {
    useExplorerStore.getState().markWebglFailed();
    expect(useExplorerStore.getState().webglFailed).toBe(true);
    expect(useExplorerStore.getState().view).toBe("2d");
    useExplorerStore.getState().retryWebgl();
    expect(useExplorerStore.getState().webglFailed).toBe(false);
    expect(useExplorerStore.getState().view).toBe("3d");
  });
});
