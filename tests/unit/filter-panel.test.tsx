import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilterPanel } from "@/components/FilterPanel";
import { useExplorerStore } from "@/lib/state/explorer";
import { DEFAULT_FILTERS } from "@/lib/types";
import { makeNeighborhood, yearNeighborhood } from "../fixtures/graph";

function resetStore() {
  const initial = useExplorerStore.getInitialState();
  useExplorerStore.setState(
    {
      ...initial,
      filters: {
        ...DEFAULT_FILTERS,
        relationships: [...DEFAULT_FILTERS.relationships],
      },
      neighborhood: null,
      centerId: null,
      selectedPaperId: null,
      history: [],
      historyIndex: -1,
    },
    true,
  );
}

describe("FilterPanel", () => {
  beforeEach(() => {
    resetStore();
    window.history.replaceState(null, "", "/explore");
  });

  it("coordinates relationship and year filters with the visible summary", async () => {
    const user = userEvent.setup();
    const neighborhood = yearNeighborhood();
    useExplorerStore.setState({
      neighborhood,
      centerId: neighborhood.centerId,
      selectedPaperId: neighborhood.centerId,
    });

    render(<FilterPanel open onClose={vi.fn()} />);

    expect(screen.getByRole("complementary", { name: "Filters" })).toHaveTextContent(
      "7 of 7 loaded neighbors visible.",
    );

    await user.click(screen.getByRole("checkbox", { name: /^Reference/ }));
    expect(useExplorerStore.getState().filters.relationships).toEqual([
      "citing",
      "recommended",
    ]);
    expect(screen.getByRole("complementary", { name: "Filters" })).toHaveTextContent(
      "3 of 7 loaded neighbors visible.",
    );

    const fromInput = screen.getByRole("spinbutton", { name: "From" });
    await user.clear(fromInput);
    await user.type(fromInput, "2010");
    await user.tab();

    expect(useExplorerStore.getState().filters.yearStart).toBe(2010);
    expect(screen.getByRole("complementary", { name: "Filters" })).toHaveTextContent(
      "3 of 7 loaded neighbors visible.",
    );

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(useExplorerStore.getState().filters).toEqual({
      ...DEFAULT_FILTERS,
      relationships: [...DEFAULT_FILTERS.relationships],
    });
    expect(screen.getByRole("complementary", { name: "Filters" })).toHaveTextContent(
      "7 of 7 loaded neighbors visible.",
    );
  });

  it("shows an explicit empty state when every relationship is unchecked", async () => {
    const user = userEvent.setup();
    const neighborhood = makeNeighborhood({
      references: yearNeighborhood().nodes
        .filter((node) => node.memberships.includes("reference"))
        .map((node) => node.paper),
    });
    useExplorerStore.setState({
      neighborhood,
      centerId: neighborhood.centerId,
      selectedPaperId: neighborhood.centerId,
    });

    render(<FilterPanel open onClose={vi.fn()} />);

    for (const name of [/^Reference/, /^Citing/, /^Recommended/]) {
      await user.click(screen.getByRole("checkbox", { name }));
    }

    expect(useExplorerStore.getState().filters.relationships).toEqual([]);
    expect(
      screen.getByText(/No relationships selected, so every neighbor is hidden/),
    ).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Filters" })).toHaveTextContent(
      "0 of 4 loaded neighbors visible.",
    );
    expect(screen.getByText(/The center remains visible/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore all" }));
    expect(useExplorerStore.getState().filters.relationships).toEqual([
      "reference",
      "citing",
      "recommended",
    ]);
  });

  it("filters loaded text without issuing a network request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const neighborhood = yearNeighborhood();
    useExplorerStore.setState({
      neighborhood,
      centerId: neighborhood.centerId,
      selectedPaperId: neighborhood.centerId,
    });

    render(<FilterPanel open onClose={vi.fn()} />);
    const textInput = screen.getByRole("searchbox", {
      name: "Filter loaded papers by text",
    });
    await user.type(textInput, "later");

    expect(useExplorerStore.getState().filters.text).toBe("later");
    expect(screen.getByRole("complementary", { name: "Filters" })).toHaveTextContent(
      "1 of 7 loaded neighbors visible.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the relationship count badges out of the checkbox label text", () => {
    const neighborhood = yearNeighborhood();
    useExplorerStore.setState({
      neighborhood,
      centerId: neighborhood.centerId,
      selectedPaperId: neighborhood.centerId,
    });

    render(<FilterPanel open onClose={vi.fn()} />);
    const referenceRow = screen
      .getByRole("checkbox", { name: /^Reference/ })
      .closest(".filter-row");
    expect(referenceRow).not.toBeNull();
    expect(
      within(referenceRow as HTMLElement).getByLabelText("4 loaded"),
    ).toHaveTextContent("4");
  });
});
