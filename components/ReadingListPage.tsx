"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bookmark,
  Check,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  NotebookPen,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { SavedPaper } from "@/lib/types";
import { useExplorerStore } from "@/lib/state/explorer";
import { useReadingListStore } from "@/lib/state/reading-list";
import {
  buildReadingListMarkdown,
  downloadText,
  readingListToExport,
} from "@/lib/graph/export";
import {
  formatCitations,
  formatYear,
  getVisibleNeighborhood,
} from "@/lib/graph/selectors";
import { formatAuthors, paperSourceLinks } from "@/lib/format";
import { Dialog } from "@/components/Dialog";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

function exportStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function ReadingItem({ item }: { item: SavedPaper }) {
  const removePaper = useReadingListStore((state) => state.removePaper);
  const updateNote = useReadingListStore((state) => state.updateNote);
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const filters = useExplorerStore((state) => state.filters);
  const links = paperSourceLinks(item.paper);

  const inCurrentView = neighborhood
    ? getVisibleNeighborhood(neighborhood, filters).visibleIds.has(
        item.paper.id,
      )
    : false;

  return (
    <article className="reading-item">
      <div className="reading-item-head">
        <div className="reading-item-copy">
          <h2>{item.paper.title}</h2>
          <div className="reading-item-meta">
            <span>
              <strong>Authors:</strong> {formatAuthors(item.paper)}
            </span>
            <span>
              <strong>Year:</strong> {formatYear(item.paper.year)}
            </span>
            <span>
              <strong>Venue:</strong> {item.paper.venue ?? "Unknown"}
            </span>
            <span>
              <strong>Indexed citations:</strong>{" "}
              {formatCitations(item.paper.citationCount)}
            </span>
          </div>
          <div className="reading-item-meta">
            <span>
              Saved{" "}
              {new Date(item.savedAt).toLocaleDateString("en", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {item.sourceCenterTitle ? (
              <span>
                from center <strong>{item.sourceCenterTitle}</strong>
              </span>
            ) : null}
            {neighborhood ? (
              <span>
                {inCurrentView ? "In current loaded view" : "Not in current view"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="reading-item-actions">
          {links[0] ? (
            <a
              className="btn btn-sm"
              href={links[0].href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {links[0].label}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            className="icon-btn"
            onClick={() => removePaper(item.paper.id)}
            aria-label={`Remove ${item.paper.title} from reading list`}
            title="Remove from reading list"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {item.paper.abstract ? (
        <p className="reading-item-abstract">{item.paper.abstract}</p>
      ) : (
        <p className="reading-item-abstract reading-item-abstract-missing">
          Abstract unavailable in the saved record.
        </p>
      )}

      <div className="reading-note">
        <label htmlFor={`note-${item.paper.id}`}>
          <NotebookPen size={12} aria-hidden="true" />
          Private note
        </label>
        <textarea
          id={`note-${item.paper.id}`}
          value={item.note}
          maxLength={10_000}
          placeholder="Why you saved it, what to check, or a question to follow up."
          onChange={(event) => updateNote(item.paper.id, event.target.value)}
        />
        <div className="reading-note-foot">
          <span>Stored only in this browser.</span>
          <span>{item.note.length.toLocaleString()} / 10,000</span>
        </div>
      </div>
    </article>
  );
}

export function ReadingListPage() {
  const items = useReadingListStore((state) => state.items);
  const hydrated = useReadingListStore((state) => state.hydrated);
  const storageWarning = useReadingListStore((state) => state.storageWarning);
  const dismissWarning = useReadingListStore((state) => state.dismissWarning);
  const clearAll = useReadingListStore((state) => state.clearAll);
  const hydrate = useReadingListStore((state) => state.hydrate);
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  function handleMarkdown() {
    if (items.length === 0) return;
    downloadText(
      buildReadingListMarkdown(items, neighborhood),
      `paper-orbit-reading-list-${exportStamp()}.md`,
      "text/markdown;charset=utf-8",
    );
    setMessage(
      `Exported ${items.length} saved ${
        items.length === 1 ? "paper" : "papers"
      } as Markdown.`,
    );
  }

  function handleJson() {
    if (items.length === 0) return;
    downloadText(
      JSON.stringify(readingListToExport(items, neighborhood), null, 2),
      `paper-orbit-reading-list-${exportStamp()}.json`,
      "application/json;charset=utf-8",
    );
    setMessage(
      `Exported ${items.length} saved ${
        items.length === 1 ? "paper" : "papers"
      } as JSON with provenance.`,
    );
  }

  function handleClear() {
    clearAll();
    setConfirmOpen(false);
    setMessage("The reading list and its notes were cleared from this browser.");
  }

  return (
    <>
      <SiteHeader searchMode="either" />
      <main id="main" className="reading-page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Local shortlist</p>
            <h1>Reading list</h1>
            <p>
              Papers you saved while exploring. Notes and metadata are stored in
              this browser only; nothing is uploaded or synced. Exports include
              only saved papers and provenance.
            </p>
          </div>
          <div className="page-head-actions">
            <Link
              href="/explore?center=syn-paper-001&mode=demo"
              className="btn btn-primary"
            >
              <Bookmark size={14} aria-hidden="true" />
              Open demo explorer
            </Link>
          </div>
        </div>

        <div className="sr-only" role="status" aria-live="polite">
          {message}
        </div>

        {storageWarning ? (
          <div className="storage-warning" role="alert">
            <TriangleAlert size={15} aria-hidden="true" />
            <span>{storageWarning}</span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={dismissWarning}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="reading-toolbar">
          <span className="reading-toolbar-note">
            {hydrated
              ? `${items.length} saved ${
                  items.length === 1 ? "paper" : "papers"
                } · deduplicated by provider ID`
              : "Loading saved papers…"}
          </span>
          <div className="reading-toolbar-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleMarkdown}
              disabled={items.length === 0}
            >
              <FileText size={13} aria-hidden="true" />
              Markdown
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleJson}
              disabled={items.length === 0}
            >
              <FileJson size={13} aria-hidden="true" />
              JSON
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setConfirmOpen(true)}
              disabled={items.length === 0}
            >
              <Trash2 size={13} aria-hidden="true" />
              Clear list
            </button>
          </div>
        </div>

        {!hydrated ? (
          <div className="reading-empty">
            <div className="spinner" aria-hidden="true" />
            <h2>Loading your reading list</h2>
            <p>Reading from this browser&apos;s local storage.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="reading-empty">
            <div className="details-empty-icon">
              <Bookmark size={23} aria-hidden="true" />
            </div>
            <h2>No saved papers yet</h2>
            <p>
              Open a paper&apos;s details in the explorer and use “Add to reading
              list.” Saved papers, notes, and exports will appear here.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link
                href="/explore?center=syn-paper-001&mode=demo"
                className="btn btn-primary"
              >
                <Download size={14} aria-hidden="true" />
                Explore the synthetic demo
              </Link>
              <Link href="/" className="btn btn-ghost">
                Search for a paper
              </Link>
            </div>
          </div>
        ) : (
          <div className="reading-list">
            {items.map((item) => (
              <ReadingItem key={item.paper.id} item={item} />
            ))}
          </div>
        )}

        <p className="reading-page-note">
          <Check size={13} aria-hidden="true" />
          Reading-list exports describe only user-saved papers. Citation and
          recommendation samples from an exploration session are not a complete
          graph.
        </p>
      </main>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Clear the reading list?"
        description="This removes every saved paper and note from this browser. Export first if you want to keep a copy."
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmOpen(false)}
            >
              Keep list
            </button>
            <button type="button" className="btn btn-danger" onClick={handleClear}>
              <Trash2 size={14} aria-hidden="true" />
              Clear everything
            </button>
          </>
        }
      >
        <p className="provenance-note">
          This action cannot be undone. The exported Markdown or JSON files are
          not affected.
        </p>
      </Dialog>

      <SiteFooter />
    </>
  );
}
