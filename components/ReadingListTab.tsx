"use client";

import Link from "next/link";
import { Bookmark, ExternalLink, Trash2 } from "lucide-react";
import { useExplorerStore } from "@/lib/state/explorer";
import { useReadingListStore } from "@/lib/state/reading-list";
import { shortAuthors } from "@/lib/format";
import { formatYear, getVisibleNeighborhood } from "@/lib/graph/selectors";

export function ReadingListTab() {
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const filters = useExplorerStore((state) => state.filters);
  const selectPaper = useExplorerStore((state) => state.selectPaper);
  const items = useReadingListStore((state) => state.items);
  const removePaper = useReadingListStore((state) => state.removePaper);

  const visibleIds = neighborhood
    ? getVisibleNeighborhood(neighborhood, filters).visibleIds
    : new Set<string>();

  return (
    <div className="reading-tab">
      <div className="reading-tab-head">
        <p>
          {items.length === 0
            ? "No saved papers yet."
            : `${items.length} saved ${
                items.length === 1 ? "paper" : "papers"
              } in this browser.`}
        </p>
        <Link href="/reading-list" className="btn btn-sm">
          Open full reading list
          <ExternalLink size={12} aria-hidden="true" />
        </Link>
      </div>

      <div className="reading-tab-list">
        {items.length === 0 ? (
          <div className="reading-tab-empty">
            Use the bookmark action on a paper to keep it here. Saved notes and
            exports are available on the full reading-list page.
          </div>
        ) : (
          items.map((item) => {
            const inCurrentView = neighborhood
              ? visibleIds.has(item.paper.id)
              : false;
            return (
              <div key={item.paper.id} className="reading-tab-item">
                <Bookmark size={13} aria-hidden="true" style={{ marginTop: 2 }} />
                <div className="reading-tab-copy">
                  {inCurrentView ? (
                    <button
                      type="button"
                      className="reading-tab-title"
                      style={{
                        background: "none",
                        border: 0,
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      onClick={() => selectPaper(item.paper.id)}
                    >
                      {item.paper.title}
                    </button>
                  ) : (
                    <div className="reading-tab-title">{item.paper.title}</div>
                  )}
                  <div className="reading-tab-meta">
                    {shortAuthors(item.paper)} · {formatYear(item.paper.year)}
                    {neighborhood && !inCurrentView
                      ? " · not in current view"
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removePaper(item.paper.id)}
                  aria-label={`Remove ${item.paper.title} from reading list`}
                  title="Remove from reading list"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
