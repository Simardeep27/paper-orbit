"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Crosshair,
  ExternalLink,
  GitCompare,
  Info,
  Orbit,
  TriangleAlert,
  X,
} from "lucide-react";
import { useExplorerStore, visibleSelectedNode } from "@/lib/state/explorer";
import { useReadingListStore } from "@/lib/state/reading-list";
import {
  formatCitations,
  formatYear,
  getCenterNode,
  getRelationshipDescription,
  isCenterAvailableOffline,
} from "@/lib/graph/selectors";
import { SIMILARITY_HELP } from "@/lib/types";
import {
  formatSimilarity,
  paperSourceLinks,
  similarityCoverageLabel,
} from "@/lib/format";
import { PaperBadges } from "@/components/PaperBadges";

interface PaperDetailsProps {
  onClose: () => void;
  open?: boolean;
}

export function PaperDetails({ onClose, open = true }: PaperDetailsProps) {
  const selected = useExplorerStore(visibleSelectedNode);
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const sourceMode = useExplorerStore((state) => state.sourceMode);
  const status = useExplorerStore((state) => state.status);
  const loadingCenterId = useExplorerStore((state) => state.loadingCenterId);
  const compareIds = useExplorerStore((state) => state.compareIds);
  const loadCenter = useExplorerStore((state) => state.loadCenter);
  const toggleCompare = useExplorerStore((state) => state.toggleCompare);
  const announce = useExplorerStore((state) => state.announce);
  const savedItems = useReadingListStore((state) => state.items);
  const togglePaper = useReadingListStore((state) => state.togglePaper);
  const [expandedAuthorsFor, setExpandedAuthorsFor] = useState<string | null>(
    null,
  );

  if (!neighborhood) return null;

  const authorsExpanded = expandedAuthorsFor === selected?.paper.id;

  const center = getCenterNode(neighborhood);
  const centerTitle = center?.paper.title ?? null;
  const centerId = neighborhood.centerId;

  if (!selected) {
    return (
      <aside
        className={`panel details-panel${open ? " details-panel-open" : ""}`}
        aria-label="Paper details"
        id="paper-details"
      >
        <div className="details-panel-inner">
          <div className="details-empty">
            <div className="details-empty-icon">
              <Orbit size={22} aria-hidden="true" />
            </div>
            <div>
              <strong>Select a paper</strong>
              <p>
                Choose a node in the 3D or 2D view, or a row in the paper list,
                to inspect its metadata, relationship evidence, and text score.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm drawer-close"
              onClick={onClose}
            >
              Close details
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const paper = selected.paper;
  const isCenter = paper.id === neighborhood.centerId;
  const saved = savedItems.some((item) => item.paper.id === paper.id);
  const compared = compareIds.includes(paper.id);
  const recenterAvailable = isCenterAvailableOffline(neighborhood, paper.id);
  const reasons = getRelationshipDescription(
    selected,
    neighborhood.centerId,
    neighborhood.recommendationPool,
  );
  const links = paperSourceLinks(paper);
  const authorNames = paper.authors.map((author) => author.name);
  const visibleAuthors =
    authorsExpanded || authorNames.length <= 4
      ? authorNames
      : authorNames.slice(0, 3);

  async function handleRecenter() {
    await loadCenter(paper.id, {
      mode: sourceMode,
      historyMode: "push",
    });
  }

  function handleSave() {
    const result = togglePaper(paper, centerId, centerTitle);
    announce(
      result === "added"
        ? `Saved "${paper.title}" to the reading list.`
        : `Removed "${paper.title}" from the reading list.`,
    );
  }

  return (
    <aside
      className={`panel details-panel${open ? " details-panel-open" : ""}`}
      aria-label="Paper details"
      id="paper-details"
    >
      <div className="details-panel-inner">
        <div className="details-top">
          <div className="details-badges">
            {isCenter ? (
              <span className="badge badge-multiple">Center paper</span>
            ) : null}
            <PaperBadges memberships={selected.memberships} />
            {sourceMode === "demo" ? (
              <span className="badge badge-synthetic">Synthetic</span>
            ) : sourceMode === "snapshot" ? (
              <span className="badge badge-live">Stored snapshot</span>
            ) : null}
          </div>
          <div className="details-top-actions">
            <button
              type="button"
              className="icon-btn drawer-close"
              onClick={onClose}
              aria-label="Close paper details"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        <h2 className="details-title">{paper.title}</h2>

        <p className="details-authors">
          {authorNames.length === 0 ? "Authors unavailable" : null}
          {visibleAuthors.join(", ")}
          {authorNames.length > visibleAuthors.length ? (
            <>
              {" "}
              <button
                type="button"
                className="expand-link"
                onClick={() => setExpandedAuthorsFor(selected?.paper.id ?? null)}
              >
                +{authorNames.length - visibleAuthors.length} more
              </button>
            </>
          ) : null}
          {authorsExpanded && authorNames.length > 4 ? (
            <>
              {" "}
              <button
                type="button"
                className="expand-link"
                onClick={() => setExpandedAuthorsFor(null)}
              >
                Show fewer
              </button>
            </>
          ) : null}
        </p>

        <div className="details-meta">
          <div className="meta-cell">
            <span className="meta-label">Year</span>
            <span className="meta-value mono">{formatYear(paper.year)}</span>
          </div>
          <div className="meta-cell">
            <span className="meta-label">Venue</span>
            <span className="meta-value" title={paper.venue ?? undefined}>
              {paper.venue ?? "Unknown"}
            </span>
          </div>
          <div className="meta-cell">
            <span className="meta-label">Provider citations</span>
            <span className="meta-value mono">
              {formatCitations(paper.citationCount)}
            </span>
          </div>
          <div className="meta-cell">
            <span className="meta-label">Provider references</span>
            <span className="meta-value mono">
              {paper.referenceCount === null
                ? "Unknown"
                : paper.referenceCount.toLocaleString()}
            </span>
          </div>
        </div>

        <section className="details-section" aria-labelledby="why-heading">
          <div className="details-section-title" id="why-heading">
            Why it is here
          </div>
          <ul className="why-list">
            {reasons.map((reason) => (
              <li key={reason}>
                <Info size={13} aria-hidden="true" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="details-section" aria-labelledby="abstract-heading">
          <div className="details-section-title" id="abstract-heading">
            Abstract
          </div>
          <div className="abstract">
            {paper.abstract ? (
              <p>{paper.abstract}</p>
            ) : (
              <p className="abstract-empty">
                Abstract unavailable. Text similarity may use the title only or
                be unavailable.
              </p>
            )}
          </div>
        </section>

        <section className="details-section" aria-labelledby="similarity-heading">
          <div className="details-section-title" id="similarity-heading">
            Local text similarity
            <span className="badge badge-muted">
              {isCenter
                ? "Center"
                : similarityCoverageLabel(selected.similarityCoverage)}
            </span>
          </div>
          <div className="similarity-box">
            <div className="similarity-head">
              <span
                className={`similarity-score${
                  selected.textSimilarity === null ? " isNull" : ""
                }`}
              >
                {isCenter
                  ? "—"
                  : formatSimilarity(
                      selected.textSimilarity,
                      selected.similarityCoverage,
                    )}
              </span>
              <span className="similarity-caption">
                {isCenter ? "Reference point" : "Cosine to center"}
              </span>
            </div>
            <p className="similarity-copy">
              {isCenter
                ? "The center paper is the reference point for every local text score in this neighborhood."
                : SIMILARITY_HELP}
            </p>
          </div>
        </section>

        {links.length > 0 ? (
          <div className="link-list">
            {links.map((link) => (
              <a
                key={link.href}
                className="source-link"
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {link.label}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : null}

        <div className="details-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleRecenter()}
            disabled={isCenter || status === "loading"}
          >
            <Crosshair size={14} aria-hidden="true" />
            {isCenter
              ? "Current center"
              : loadingCenterId === paper.id
                ? "Recentering…"
                : "Make central paper"}
          </button>
          <button
            type="button"
            className={`btn${saved ? " btn-danger" : ""}`}
            onClick={handleSave}
            aria-pressed={saved}
          >
            {saved ? (
              <BookmarkCheck size={14} aria-hidden="true" />
            ) : (
              <Bookmark size={14} aria-hidden="true" />
            )}
            {saved ? "Saved" : "Add to reading list"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => toggleCompare(paper.id)}
            aria-pressed={compared}
          >
            <GitCompare size={14} aria-hidden="true" />
            {compared ? "In comparison" : "Compare"}
          </button>

          {!recenterAvailable && !isCenter ? (
            <p className="recenter-note">
              <TriangleAlert
                size={12}
                aria-hidden="true"
                style={{ marginRight: 5, verticalAlign: "-2px" }}
              />
              This paper has no stored offline neighborhood. You can still
              inspect it, save it, and compare it from this view. Recentering
              will explain why it cannot load.
            </p>
          ) : null}
        </div>

        <p className="filter-help" style={{ marginTop: 10 }}>
          Citation counts describe indexed citations, not quality. See{" "}
          <Link href="/about" className="source-link">
            data sources and limitations
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}
