"use client";

import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useExplorerStore } from "@/lib/state/explorer";
import { getCenterNode, getNeighborNodes } from "@/lib/graph/selectors";
import { formatTimestamp } from "@/lib/format";
import { Dialog } from "@/components/Dialog";
import { providerLabel } from "@/lib/providers/labels";

interface ProvenanceDialogProps {
  open: boolean;
  onClose: () => void;
}

const BRANCH_LABELS = {
  references: "References",
  citing: "Citing papers",
  recommended: "Recommendations",
} as const;

export function ProvenanceDialog({ open, onClose }: ProvenanceDialogProps) {
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const center = neighborhood ? getCenterNode(neighborhood) : undefined;

  if (!neighborhood) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title="Data provenance"
        description="Load a neighborhood to inspect provider and sampling details."
      >
        <p className="provenance-note">
          No neighborhood is loaded. Open the synthetic demo or search for a
          paper to see its data source, retrieval time, and branch coverage.
        </p>
      </Dialog>
    );
  }

  const neighbors = getNeighborNodes(neighborhood);
  const unknownYears = neighbors.filter(
    (node) => node.paper.year === null,
  ).length;
  const unknownCitations = neighbors.filter(
    (node) => node.paper.citationCount === null,
  ).length;
  const missingAbstracts = neighbors.filter(
    (node) => !node.paper.abstract,
  ).length;
  const isSynthetic = neighborhood.mode === "synthetic-demo";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Data provenance"
      description="What this loaded neighborhood contains, where it came from, and what it does not cover."
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      {isSynthetic ? (
        <div className="search-status search-error" style={{ marginBottom: 16 }}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            <strong>Synthetic interaction demo.</strong>{" "}
            {neighborhood.demo?.notice ??
              "All records and relationships in this neighborhood are fictional."}{" "}
            Do not cite, redistribute, or present this as real research data.
          </span>
        </div>
      ) : null}

      <section className="provenance-section">
        <h3>Loaded neighborhood</h3>
        <div className="provenance-grid">
          <div className="provenance-cell">
            <span>Mode</span>
            <strong>
              {neighborhood.mode === "synthetic-demo"
                ? "Synthetic demo"
                : neighborhood.mode === "snapshot"
                  ? "Stored snapshot"
                  : "Live provider"}
            </strong>
          </div>
          <div className="provenance-cell">
            <span>Provider</span>
            <strong>{providerLabel(neighborhood.provider)}</strong>
          </div>
          <div className="provenance-cell">
            <span>Retrieved</span>
            <strong>{formatTimestamp(neighborhood.fetchedAt)}</strong>
          </div>
          <div className="provenance-cell">
            <span>
              {neighborhood.provider === "openalex"
                ? "Related works"
                : "Recommendation pool"}
            </span>
            <strong>
              {neighborhood.provider === "openalex"
                ? "OpenAlex associations"
                : neighborhood.recommendationPool}
            </strong>
          </div>
          <div className="provenance-cell">
            <span>Center</span>
            <strong>{center?.paper.title ?? neighborhood.centerId}</strong>
          </div>
          <div className="provenance-cell">
            <span>Loaded nodes</span>
            <strong>
              {neighborhood.nodes.length} total · {neighbors.length} neighbors
            </strong>
          </div>
        </div>
        <p className="provenance-note">
          Branches are bounded samples. A loaded neighborhood is not a complete
          citation graph, and fetched counts describe only this sample.
        </p>
      </section>

      <section className="provenance-section">
        <h3>Branch coverage</h3>
        <table className="branch-table">
          <thead>
            <tr>
              <th scope="col">Branch</th>
              <th scope="col">Status</th>
              <th scope="col">Requested</th>
              <th scope="col">Received</th>
              <th scope="col">Distinct</th>
              <th scope="col">Skipped</th>
              <th scope="col">Next offset</th>
            </tr>
          </thead>
          <tbody>
            {(
              Object.keys(BRANCH_LABELS) as (keyof typeof BRANCH_LABELS)[]
            ).map((branch) => {
              const coverage = neighborhood.coverage[branch];
              return (
                <tr key={branch}>
                  <td>{BRANCH_LABELS[branch]}</td>
                  <td>{coverage.status}</td>
                  <td>{coverage.requestedLimit}</td>
                  <td>{coverage.receivedEntries}</td>
                  <td>{coverage.validDistinctPapers}</td>
                  <td>{coverage.skippedEntries}</td>
                  <td>{coverage.nextOffset ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(
          Object.keys(BRANCH_LABELS) as (keyof typeof BRANCH_LABELS)[]
        ).map((branch) => {
          const message = neighborhood.coverage[branch].message;
          if (!message) return null;
          return (
            <p key={branch} className="provenance-note">
              <strong>{BRANCH_LABELS[branch]}:</strong> {message}
            </p>
          );
        })}
        <p className="provenance-note">
          An empty successful branch is different from a failed branch. Failed
          or unavailable branches are shown as such; they are never presented as
          “no citations.” Provider-side totals are not claimed here.
        </p>
      </section>

      <section className="provenance-section">
        <h3>Missing values in this sample</h3>
        <div className="provenance-grid">
          <div className="provenance-cell">
            <span>Unknown years</span>
            <strong>
              {unknownYears} of {neighbors.length} neighbors
            </strong>
          </div>
          <div className="provenance-cell">
            <span>Unknown citation counts</span>
            <strong>
              {unknownCitations} of {neighbors.length} neighbors
            </strong>
          </div>
          <div className="provenance-cell">
            <span>Missing abstracts</span>
            <strong>
              {missingAbstracts} of {neighbors.length} neighbors
            </strong>
          </div>
          <div className="provenance-cell">
            <span>Similarity run</span>
            <strong>
              {neighborhood.similarity.algorithm} v
              {neighborhood.similarity.version}
            </strong>
          </div>
        </div>
        <p className="provenance-note">
          Text similarity uses TF-IDF cosine over{" "}
          {neighborhood.similarity.corpusIds.length} loaded papers. It depends
          on available titles and abstracts and can miss conceptual similarity.
          Citation counts describe indexed citations and favor older papers;
          they are not a quality rating.
        </p>
      </section>

      {neighborhood.warnings.length > 0 ? (
        <section className="provenance-section">
          <h3>Warnings</h3>
          <ul className="provenance-warnings">
            {neighborhood.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="provenance-section">
        <h3>Source and attribution</h3>
        {isSynthetic ? (
          <div className="attribution">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>
              Synthetic fixtures generated for Paper Orbit. Source records are
              hand-authored and deterministic; no external provider data is
              included. See{" "}
              <Link href="/about">data sources and limitations</Link>.
            </span>
          </div>
        ) : neighborhood.provider === "openalex" ? (
          <div className="attribution">
            <span>
              Paper metadata and citation links from{" "}
              <a
                href="https://openalex.org/"
                target="_blank"
                rel="noreferrer noopener"
              >
                OpenAlex <ExternalLink size={10} aria-hidden="true" />
              </a>
              . OpenAlex data is available under CC0; no full text is stored.
              See{" "}
              <Link href="/about">data sources and limitations</Link>.
            </span>
          </div>
        ) : (
          <div className="attribution">
            <span>
              Paper metadata from{" "}
              <a
                href="https://www.semanticscholar.org/?utm_source=api"
                target="_blank"
                rel="noreferrer noopener"
              >
                Semantic Scholar <ExternalLink size={10} aria-hidden="true" />
              </a>
              . Review the{" "}
              <a
                href="https://api.semanticscholar.org/license/"
                target="_blank"
                rel="noreferrer noopener"
              >
                API license
              </a>{" "}
              before redistribution or public display. No full text is stored.
            </span>
          </div>
        )}
      </section>
    </Dialog>
  );
}
