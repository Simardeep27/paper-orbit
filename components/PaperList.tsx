"use client";

import {
  ArrowDownWideNarrow,
  Bookmark,
  BookmarkCheck,
  GitCompare,
} from "lucide-react";
import type { OrbitNode, SortKey } from "@/lib/types";
import { useExplorerStore } from "@/lib/state/explorer";
import { useReadingListStore } from "@/lib/state/reading-list";
import {
  formatScore,
  getCenterNode,
  getVisibleNeighborhood,
  sortNeighborNodes,
} from "@/lib/graph/selectors";
import { shortAuthors } from "@/lib/format";
import { PaperBadges } from "@/components/PaperBadges";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "similarity", label: "Text similarity" },
  { value: "citations", label: "Citation count" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "recommendation", label: "Recommendation rank" },
];

interface PaperListProps {
  immersive?: boolean;
}

interface RowProps {
  node: OrbitNode;
  selected: boolean;
  compared: boolean;
  saved: boolean;
  onSave: (node: OrbitNode) => void;
  onCompare: (node: OrbitNode) => void;
}

function PaperRow({
  node,
  selected,
  compared,
  saved,
  onSave,
  onCompare,
}: RowProps) {
  const selectPaper = useExplorerStore((state) => state.selectPaper);
  const setHoveredPaper = useExplorerStore((state) => state.setHoveredPaper);

  return (
    <div
      className={`paper-row${selected ? " paper-row-selected" : ""}${
        compared ? " paper-row-compared" : ""
      }`}
      onMouseEnter={() => setHoveredPaper(node.paper.id)}
      onMouseLeave={() => setHoveredPaper(null)}
    >
      <div className="paper-row-main">
        <button
          type="button"
          className="paper-title-btn"
          onClick={() => selectPaper(node.paper.id)}
          aria-pressed={selected}
        >
          {node.paper.title}
        </button>
        <div className="paper-sub">
          <span>{shortAuthors(node.paper)}</span>
          {node.recommendationRank !== null ? (
            <span>Recommendation #{node.recommendationRank}</span>
          ) : null}
          {node.similarityCoverage === "title-only" ? (
            <span>Title-only text score</span>
          ) : null}
        </div>
      </div>

      <div className="paper-cell year-cell">
        <span className="paper-cell-label">Year</span>
        {node.paper.year ?? "Unknown"}
      </div>

      <div className="paper-cell venue-cell" title={node.paper.venue ?? undefined}>
        <span className="paper-cell-label">Venue</span>
        {node.paper.venue ?? "Venue unknown"}
      </div>

      <div className="paper-cell">
        <span className="paper-cell-label">Relationship</span>
        <PaperBadges memberships={node.memberships} />
      </div>

      <div className="paper-cell citation-cell">
        <span className="paper-cell-label">Citations</span>
        <span className="tabular">
          {node.paper.citationCount === null
            ? "Unknown"
            : node.paper.citationCount.toLocaleString()}
        </span>
      </div>

      <div className="paper-cell score-cell">
        <span className="paper-cell-label">Text score</span>
        <strong>{formatScore(node.textSimilarity)}</strong>
        <span className="score-sub">
          {node.similarityCoverage === "unavailable"
            ? "No text"
            : node.similarityCoverage === "title-only"
              ? "Title only"
              : "Title + abstract"}
        </span>
      </div>

      <div className="row-actions">
        <button
          type="button"
          className={`icon-btn${saved ? " isSaved" : ""}`}
          onClick={() => onSave(node)}
          aria-label={
            saved
              ? `Remove ${node.paper.title} from reading list`
              : `Save ${node.paper.title} to reading list`
          }
          title={saved ? "Saved to reading list" : "Save to reading list"}
        >
          {saved ? (
            <BookmarkCheck size={15} aria-hidden="true" />
          ) : (
            <Bookmark size={15} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={`icon-btn${compared ? " isActive" : ""}`}
          onClick={() => onCompare(node)}
          aria-label={`${
            compared ? "Remove" : "Add"
          } ${node.paper.title} ${compared ? "from" : "to"} comparison`}
          title={compared ? "Remove from comparison" : "Add to comparison"}
        >
          <GitCompare size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function PaperList({ immersive = false }: PaperListProps) {
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const filters = useExplorerStore((state) => state.filters);
  const sort = useExplorerStore((state) => state.sort);
  const setSort = useExplorerStore((state) => state.setSort);
  const selectedPaperId = useExplorerStore((state) => state.selectedPaperId);
  const compareIds = useExplorerStore((state) => state.compareIds);
  const toggleCompare = useExplorerStore((state) => state.toggleCompare);
  const resetFilters = useExplorerStore((state) => state.resetFilters);
  const announce = useExplorerStore((state) => state.announce);
  const savedItems = useReadingListStore((state) => state.items);
  const togglePaper = useReadingListStore((state) => state.togglePaper);

  if (!neighborhood) return null;

  const visible = getVisibleNeighborhood(neighborhood, filters);
  const rows = sortNeighborNodes(visible.neighbors, sort);
  const center = getCenterNode(neighborhood);
  const centerTitle = center?.paper.title ?? null;

  function handleSave(node: OrbitNode) {
    const result = togglePaper(node.paper, neighborhood?.centerId ?? null, centerTitle);
    announce(
      result === "added"
        ? `Saved "${node.paper.title}" to the reading list.`
        : `Removed "${node.paper.title}" from the reading list.`,
    );
  }

  const body = (
    <>
      <div className="list-toolbar">
        <span className="list-toolbar-note">
          Sorting loaded papers · nulls last
        </span>
        <div className="list-toolbar-right">
          <label>
            <ArrowDownWideNarrow size={13} aria-hidden="true" />
            Sort
            <select
              className="select"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort loaded papers"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="list-empty">
          <strong>No neighbors match these filters.</strong>
          <span>The center paper stays visible in the graph and details.</span>
          <button type="button" className="btn btn-sm" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
      ) : (
        <div className={`paper-list${immersive ? " paper-list-immersive" : ""}`}>
          {rows.map((node) => (
            <PaperRow
              key={node.paper.id}
              node={node}
              selected={selectedPaperId === node.paper.id}
              compared={compareIds.includes(node.paper.id)}
              saved={savedItems.some((item) => item.paper.id === node.paper.id)}
              onSave={handleSave}
              onCompare={(item) => toggleCompare(item.paper.id)}
            />
          ))}
        </div>
      )}
      <div className="list-footer">
        {rows.length} of {visible.neighbors.length} visible neighbors · Full
        metadata remains in the details panel.
      </div>
    </>
  );

  if (immersive) {
    return <div className="list-immersive-wrap">{body}</div>;
  }

  return <div className="dock-panel">{body}</div>;
}
