"use client";

import { GitCompare, Trash2, X } from "lucide-react";
import { useExplorerStore } from "@/lib/state/explorer";
import {
  formatCitations,
  formatScore,
  formatYear,
  getNodeById,
  getVisibleNeighborhood,
} from "@/lib/graph/selectors";
import { formatAuthors, similarityCoverageLabel } from "@/lib/format";
import { PaperBadges } from "@/components/PaperBadges";

export function ComparePanel() {
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const compareIds = useExplorerStore((state) => state.compareIds);
  const comparePapers = useExplorerStore((state) => state.comparePapers);
  const filters = useExplorerStore((state) => state.filters);
  const toggleCompare = useExplorerStore((state) => state.toggleCompare);
  const clearCompare = useExplorerStore((state) => state.clearCompare);
  const selectPaper = useExplorerStore((state) => state.selectPaper);

  if (!neighborhood) return null;

  const visible = getVisibleNeighborhood(neighborhood, filters);
  const candidates = compareIds
    .map((id) => ({ id, paper: comparePapers[id] }))
    .filter(
      (entry): entry is { id: string; paper: NonNullable<typeof entry.paper> } =>
        Boolean(entry.paper),
    );

  if (candidates.length === 0) {
    return (
      <div className="compare-panel">
        <div className="compare-empty">
          <GitCompare size={22} aria-hidden="true" />
          <strong>Compare two papers</strong>
          <p>
            Use the compare action on a graph node, list row, or details panel.
            Comparisons show metadata side by side without ranking a winner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="compare-panel">
      <div className="compare-toolbar">
        <p>
          {candidates.length} of 2 selected. Scores are relative to the current
          center only.
        </p>
        <div className="compare-toolbar-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearCompare}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="compare-grid">
        {candidates.map(({ id, paper }) => {
          const node = getNodeById(neighborhood, id);
          const inView = visible.visibleIds.has(id);
          const isCenter = id === neighborhood.centerId;
          return (
            <article key={id} className="compare-card">
              <div className="compare-card-head">
                <div className="compare-card-title">{paper.title}</div>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ marginLeft: "auto", flex: "none" }}
                  onClick={() => toggleCompare(id)}
                  aria-label={`Remove ${paper.title} from comparison`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>

              <div className="compare-meta">
                <span>
                  Year <strong>{formatYear(paper.year)}</strong>
                </span>
                <span>
                  Citations <strong>{formatCitations(paper.citationCount)}</strong>
                </span>
                <span>
                  Venue <strong>{paper.venue ?? "Unknown"}</strong>
                </span>
              </div>

              <div className="compare-meta">
                <span>{formatAuthors(paper, { limit: 4 })}</span>
              </div>

              {node ? (
                <PaperBadges memberships={node.memberships} />
              ) : (
                <span className="badge badge-warning">Not in current view</span>
              )}

              <div className="compare-abstract">
                {paper.abstract ?? "Abstract unavailable."}
              </div>

              <div className="compare-foot">
                {isCenter ? (
                  <span>
                    Text score: <strong>Center paper</strong>
                  </span>
                ) : node && node.textSimilarity !== null ? (
                  <span>
                    Text score:{" "}
                    <strong>
                      {formatScore(node.textSimilarity)} (
                      {similarityCoverageLabel(node.similarityCoverage)})
                    </strong>
                  </span>
                ) : (
                  <span>Not scored against current center.</span>
                )}
                {inView && node ? (
                  <button
                    type="button"
                    className="expand-link"
                    onClick={() => selectPaper(id)}
                  >
                    Open details
                  </button>
                ) : node ? (
                  <span>Hidden by current filters</span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <p className="compare-notice">
        <Trash2
          size={10}
          aria-hidden="true"
          style={{ marginRight: 4, verticalAlign: "-1px" }}
        />
        Comparison is preserved across recentering, but stale similarity is
        never reused for a new center.
      </p>
    </div>
  );
}
