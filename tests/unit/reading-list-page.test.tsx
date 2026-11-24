import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingListPage } from "@/components/ReadingListPage";
import { useReadingListStore } from "@/lib/state/reading-list";
import { saveReadingList, paperToSavedPaper } from "@/lib/state/persistence";
import { makePaper } from "../fixtures/graph";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function resetReadingStore() {
  const initial = useReadingListStore.getInitialState();
  useReadingListStore.setState(
    {
      ...initial,
      items: [],
      hydrated: false,
      storageWarning: null,
      lastMessage: null,
    },
    true,
  );
  window.localStorage.clear();
}

describe("ReadingListPage", () => {
  beforeEach(() => {
    resetReadingStore();
    pushMock.mockReset();
  });

  it("hydrates saved papers, persists notes, and shows source context", async () => {
    const user = userEvent.setup();
    const paper = makePaper("saved-paper", {
      title: "A Saved Paper",
      year: 2022,
      venue: "Saved Venue",
      abstract: "A saved abstract.",
    });
    saveReadingList([
      paperToSavedPaper(paper, "center", "Center Paper Title"),
    ]);

    render(<ReadingListPage />);

    expect(await screen.findByText("A Saved Paper")).toBeInTheDocument();
    expect(screen.getByText(/Center Paper Title/)).toBeInTheDocument();
    expect(screen.getByText(/1 saved paper/)).toBeInTheDocument();

    const note = screen.getByRole("textbox", { name: /Private note/ });
    await user.type(note, "Check the citation direction.");
    await waitFor(() =>
      expect(
        JSON.parse(
          window.localStorage.getItem("paper-orbit:reading-list:v1") ??
            "null",
        ).items[0].note,
      ).toBe("Check the citation direction."),
    );
    expect(useReadingListStore.getState().items[0]?.note).toBe(
      "Check the citation direction.",
    );
  });

  it("renders an empty state with a route back to the demo", async () => {
    render(<ReadingListPage />);

    expect(
      await screen.findByRole("heading", { name: "No saved papers yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Markdown" }),
    ).toBeDisabled();
    expect(screen.getByRole("link", { name: /Explore the synthetic demo/ })).toHaveAttribute(
      "href",
      "/explore?center=syn-paper-001&mode=demo",
    );
  });

  it("does not crash when stored data is malformed and explains the issue", async () => {
    window.localStorage.setItem(
      "paper-orbit:reading-list:v1",
      "{not valid json",
    );

    render(<ReadingListPage />);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/not valid JSON/);
    expect(
      screen.getByRole("heading", { name: "No saved papers yet" }),
    ).toBeInTheDocument();
  });
});
