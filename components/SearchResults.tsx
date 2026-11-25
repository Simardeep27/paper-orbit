"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import type { Paper, SearchResultSet, SourceMode } from "@/lib/types";
import { providerLabel } from "@/lib/providers/labels";

interface SearchResultsProps {
  results: SearchResultSet | null;
  mode: SourceMode;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  inline?: boolean;
  onSelect: (paper: Paper, mode: SourceMode) => void;
  onLoadMore: () => void;
}

function resultMeta(paper: Paper): string {
  const pieces: string[] = [];
  if (paper.year !== null) pieces.push(String(paper.year));
  if (paper.venue) pieces.push(paper.venue);
  if (paper.authors.length > 0) {
    const names = paper.authors.slice(0, 2).map((author) => author.name);
    pieces.push(
      paper.authors.length > 2
        ? `${names.join(", ")} +${paper.authors.length - 2}`
        : names.join(", "),
    );
  }
  if (paper.citationCount !== null) {
    pieces.push(`${paper.citationCount.toLocaleString()} citations`);
  }
  return pieces.join(" · ");
}

export function SearchResults({
  results,
  mode,
  loading,
  loadingMore,
  error,
  inline = false,
  onSelect,
  onLoadMore,
}: SearchResultsProps) {
  const className = `search-results${inline ? " search-results-inline" : ""}`;
  const sourceLabel =
    mode === "demo"
      ? "Synthetic demo catalog"
      : mode === "snapshot"
        ? "Stored Semantic Scholar snapshot"
        : results?.papers[0]
          ? `Live ${providerLabel(results.papers[0].source)}`
          : "Live provider";

  if (loading) {
    return (
      <div className={className} aria-busy="true" aria-live="polite">
        <div className="search-status">
          <LoaderCircle size={16} className="spin-icon" aria-hidden="true" />
          <span>Searching {sourceLabel}…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} role="alert">
        <div className="search-status search-error">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
        {mode === "live" ? (
          <div className="search-error-actions">
            <Link className="btn btn-sm" href="/explore?mode=snapshot">
              Browse stored snapshots
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  if (!results) return null;

  return (
    <div className={className} aria-live="polite">
      <div className="search-results-head">
        <span>
          {sourceLabel} · {results.papers.length}{" "}
          {results.papers.length === 1 ? "result" : "results"}
        </span>
        {mode === "demo" ? (
          <span className="badge badge-synthetic">Fictional data</span>
        ) : null}
      </div>

      {results.papers.length === 0 ? (
        <div className="search-status">
          <CircleAlert size={16} aria-hidden="true" />
          <span>
            No papers matched. Try a title, author, DOI, or arXiv identifier.
            {mode === "demo"
              ? " The demo searches a small fictional catalog."
              : ""}
          </span>
        </div>
      ) : (
        results.papers.map((paper) => {
          const hasNeighborhood =
            mode === "live" ||
            (mode === "demo" &&
              results.demoAvailableCenterIds?.includes(paper.id) === true) ||
            (mode === "snapshot" &&
              results.snapshotAvailableCenterIds?.includes(paper.id) === true);
          return (
            <button
              key={paper.id}
              type="button"
              className="search-result"
              onClick={() => onSelect(paper, mode)}
              aria-label={`Explore ${paper.title}`}
            >
              <span>
                <span className="search-result-title">{paper.title}</span>
                <span className="search-result-meta">{resultMeta(paper)}</span>
              </span>
              <span className="search-result-side">
                {mode !== "live" ? (
                  <span
                    className={`badge ${
                      hasNeighborhood
                        ? mode === "snapshot"
                          ? "badge-live"
                          : "badge-synthetic"
                        : "badge-muted"
                    }`}
                  >
                    {hasNeighborhood ? "Stored neighborhood" : "Catalog only"}
                  </span>
                ) : null}
                <ArrowRight
                  size={15}
                  className="search-result-arrow"
                  aria-hidden="true"
                />
              </span>
            </button>
          );
        })
      )}

      <div className="search-footer">
        <span className="search-result-meta">
          {mode === "demo"
            ? "All records are synthetic and must not be cited."
            : mode === "snapshot"
              ? "Stored from the Semantic Scholar API; bounded samples, not a complete graph."
              : "Bounded live results from OpenAlex; availability depends on the provider."}
        </span>
        {results.nextOffset !== null ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <LoaderCircle size={13} className="spin-icon" aria-hidden="true" />
                Loading
              </>
            ) : (
              "Load more"
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
