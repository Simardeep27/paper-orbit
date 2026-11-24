import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "@/components/SearchBox";
import { makePaper } from "../fixtures/graph";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const paper = makePaper("syn-paper-001", {
  title: "Orbital Cartography for Research Literature",
  year: 2021,
  venue: "Journal of Visual Analytics",
  citationCount: 148,
  source: "synthetic-test",
});

function searchPayload() {
  return {
    papers: [paper],
    nextOffset: null,
    sourceMode: "demo",
    fetchedAt: "2026-10-20T12:00:00.000Z",
    demoAvailableCenterIds: ["syn-paper-001"],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SearchBox", () => {
  beforeEach(() => {
    pushMock.mockReset();
    window.localStorage.clear();
  });

  it("searches the demo catalog and navigates to the selected paper", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(searchPayload()));
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchBox mode="either" defaultMode="demo" />);

    await user.type(
      screen.getByRole("searchbox", {
        name: /Search papers, paste a DOI, or enter an arXiv ID/,
      }),
      "orbital",
    );
    await user.click(screen.getByRole("button", { name: "Explore paper" }));

    const resultButton = await screen.findByRole("button", {
      name: /Explore Orbital Cartography for Research Literature/,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("mode=demo");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("q=orbital");
    expect(screen.getByText(/Fictional data/)).toBeInTheDocument();

    await user.click(resultButton);
    expect(pushMock).toHaveBeenCalledWith(
      "/explore?center=syn-paper-001&mode=demo",
    );
  });

  it("resolves an arXiv identifier through the resolve route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        paper: { ...paper, externalIds: { ArXiv: "2101.00001" } },
        sourceMode: "demo",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchBox mode="demo" />);
    await user.type(
      screen.getByRole("searchbox", {
        name: /Search papers, paste a DOI, or enter an arXiv ID/,
      }),
      "arXiv:2101.00001",
    );
    await user.click(screen.getByRole("button", { name: "Explore paper" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/resolve?");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "id=ARXIV%3A2101.00001",
    );
    expect(pushMock).toHaveBeenCalledWith(
      "/explore?center=syn-paper-001&mode=demo",
    );
  });

  it("switches to live mode and surfaces a typed provider error", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Semantic Scholar is rate limiting this deployment.",
            retryable: true,
          },
        },
        429,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchBox mode="either" defaultMode="demo" />);
    await user.click(screen.getByRole("button", { name: "Live" }));
    await user.type(
      screen.getByRole("searchbox", {
        name: /Search papers, paste a DOI, or enter an arXiv ID/,
      }),
      "attention",
    );
    await user.click(screen.getByRole("button", { name: "Explore paper" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Semantic Scholar is rate limiting this deployment.",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("mode=live");
  });

  it("rejects an empty query without issuing a request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchBox mode="demo" />);
    await user.click(screen.getByRole("button", { name: "Explore paper" }));

    expect(
      await screen.findByText(/Enter a paper title, author, DOI, or arXiv ID/),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
