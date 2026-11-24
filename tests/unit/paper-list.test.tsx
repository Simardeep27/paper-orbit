import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PaperList } from "@/components/PaperList";
import { useExplorerStore } from "@/lib/state/explorer";
import { useReadingListStore } from "@/lib/state/reading-list";
import { DEFAULT_FILTERS } from "@/lib/types";
import { yearNeighborhood } from "../fixtures/graph";

function resetStores() {
  const explorer = useExplorerStore.getInitialState();
  useExplorerStore.setState(
    {
      ...explorer,
      filters: {
        ...DEFAULT_FILTERS,
        relationships: [...DEFAULT_FILTERS.relationships],
      },
      neighborhood: null,
      centerId: null,
      selectedPaperId: null,
      compareIds: [],
      comparePapers: {},
      history: [],
      historyIndex: -1,
    },
    true,
  );
  const reading = useReadingListStore.getInitialState();
  useReadingListStore.setState(
    { ...reading, items: [], hydrated: false, storageWarning: null },
    true,
  );
  window.localStorage.clear();
  window.history.replaceState(null, "", "/explore");
}

function seedNeighborhood() {
  const neighborhood = yearNeighborhood();
  useExplorerStore.setState({
    neighborhood,
    centerId: neighborhood.centerId,
    selectedPaperId: neighborhood.centerId,
  });
  return neighborhood;
}

describe("PaperList", () => {
  beforeEach(resetStores);

  it("selects a list row and keeps selection in the shared explorer state", async () => {
    const user = userEvent.setup();
    seedNeighborhood();
    render(<PaperList />);

    await user.click(
      screen.getByRole("button", {
        name: "Paper later about citation visualization",
      }),
    );

    expect(useExplorerStore.getState().selectedPaperId).toBe("later");
  });

  it("saves a paper to the persisted reading list from a row", async () => {
    const user = userEvent.setup();
    seedNeighborhood();
    render(<PaperList />);

    await user.click(
      screen.getByRole("button", {
        name: /Save Paper later about citation visualization to reading list/,
      }),
    );

    const items = useReadingListStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.paper.id).toBe("later");
    expect(items[0]?.sourceCenterId).toBe("center");

    const stored = JSON.parse(
      window.localStorage.getItem("paper-orbit:reading-list:v1") ?? "null",
    );
    expect(stored.items[0].paper.id).toBe("later");

    await user.click(
      screen.getByRole("button", {
        name: /Remove Paper later about citation visualization from reading list/,
      }),
    );
    expect(useReadingListStore.getState().items).toHaveLength(0);
  });

  it("enforces the two-paper comparison limit and replaces the oldest candidate", async () => {
    const user = userEvent.setup();
    seedNeighborhood();
    render(<PaperList />);

    await user.click(
      screen.getByRole("button", { name: /Add Paper old about citation visualization to comparison/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /Add Paper later about citation visualization to comparison/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /Add Paper rec-a about citation visualization to comparison/ }),
    );

    const state = useExplorerStore.getState();
    expect(state.compareIds).toEqual(["later", "rec-a"]);
    expect(Object.keys(state.comparePapers).sort()).toEqual(["later", "rec-a"]);
  });

  it("clears a hidden selection and offers a reset when no rows match", async () => {
    const user = userEvent.setup();
    seedNeighborhood();
    useExplorerStore.getState().selectPaper("later");
    useExplorerStore.getState().setFilters({
      relationships: ["citing"],
      yearStart: 2030,
    });
    expect(useExplorerStore.getState().selectedPaperId).toBeNull();

    render(<PaperList />);
    expect(
      screen.getByText("No neighbors match these filters."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset filters" }));

    expect(useExplorerStore.getState().filters.relationships).toEqual([
      "reference",
      "citing",
      "recommended",
    ]);
    expect(useExplorerStore.getState().filters.yearStart).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /about citation visualization$/ }),
    ).toHaveLength(7);
  });
});
