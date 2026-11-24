"use client";

import { SlidersHorizontal, X } from "lucide-react";
import type { Membership } from "@/lib/types";
import { ALL_MEMBERSHIPS, RELATIONSHIP_LABELS, SIMILARITY_HELP } from "@/lib/types";
import { useExplorerStore } from "@/lib/state/explorer";
import {
  countMemberships,
  getNeighborNodes,
  getVisibleNeighborhood,
  hasActiveFilters,
} from "@/lib/graph/selectors";
import { YearInput } from "@/components/YearInput";

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
}

const RELATIONSHIP_COPY: Record<Membership, string> = {
  reference: "Cited by the center paper",
  citing: "Papers that cite the center",
  recommended: "Provider recommendations",
};

export function FilterPanel({ open, onClose }: FilterPanelProps) {
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const filters = useExplorerStore((state) => state.filters);
  const setFilters = useExplorerStore((state) => state.setFilters);
  const resetFilters = useExplorerStore((state) => state.resetFilters);

  if (!neighborhood) return null;

  const loadedNeighbors = getNeighborNodes(neighborhood);
  const loadedCounts = countMemberships(loadedNeighbors);
  const visible = getVisibleNeighborhood(neighborhood, filters);
  const active = hasActiveFilters(filters);

  function toggleMembership(membership: Membership) {
    const selected = filters.relationships.includes(membership);
    const next = selected
      ? filters.relationships.filter((item) => item !== membership)
      : ALL_MEMBERSHIPS.filter(
          (item) => filters.relationships.includes(item) || item === membership,
        );
    setFilters({ relationships: next });
  }

  return (
    <aside
      className={`panel filter-rail${open ? " filter-rail-open" : ""}`}
      aria-label="Filters"
      id="filter-rail"
    >
      <div className="filter-header">
        <h2>
          <SlidersHorizontal
            size={14}
            aria-hidden="true"
            style={{ marginRight: 6, verticalAlign: "-2px" }}
          />
          Filters
        </h2>
        <div className="toolbar-group">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={resetFilters}
            disabled={!active}
          >
            Reset
          </button>
          <button
            type="button"
            className="icon-btn drawer-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <fieldset className="filter-group" style={{ border: 0, margin: 0, padding: "0 0 13px" }}>
        <legend className="filter-group-title">
          Relationships
          <span className="filter-count-inline">OR</span>
        </legend>
        <div className="filter-stack">
          {ALL_MEMBERSHIPS.map((membership) => {
            const checked = filters.relationships.includes(membership);
            return (
              <div key={membership} className="filter-row">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMembership(membership)}
                  />
                  <span className={`color-dot dot-${membership}`} aria-hidden="true" />
                  <span>
                    <span className="filter-label">
                      {RELATIONSHIP_LABELS[membership]}
                    </span>
                    <span className="filter-count-inline" style={{ display: "block" }}>
                      {RELATIONSHIP_COPY[membership]}
                    </span>
                  </span>
                </label>
                <span className="badge badge-muted" aria-label={`${loadedCounts[membership]} loaded`}>
                  {loadedCounts[membership]}
                </span>
              </div>
            );
          })}
        </div>
        {filters.relationships.length === 0 ? (
          <div className="filter-alert" role="status">
            No relationships selected, so every neighbor is hidden.{" "}
            <button
              type="button"
              className="expand-link"
              onClick={() => setFilters({ relationships: [...ALL_MEMBERSHIPS] })}
            >
              Restore all
            </button>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="filter-group" style={{ border: 0, margin: 0, padding: "13px 0" }}>
        <legend className="filter-group-title">
          Publication year
          <span className="filter-count-inline">inclusive</span>
        </legend>
        <div className="year-grid">
          <YearInput
            key={`from-${filters.yearStart ?? "any"}`}
            label="From"
            value={filters.yearStart}
            onCommit={(yearStart) => setFilters({ yearStart })}
          />
          <YearInput
            key={`to-${filters.yearEnd ?? "any"}`}
            label="To"
            value={filters.yearEnd}
            onCommit={(yearEnd) => setFilters({ yearEnd })}
          />
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={filters.includeUnknownYear}
            onChange={(event) =>
              setFilters({ includeUnknownYear: event.target.checked })
            }
          />
          <span>Include unknown years</span>
        </label>
      </fieldset>

      <div className="filter-group">
        <div className="filter-group-title">
          Provider citations
          <span className="filter-count-inline">minimum</span>
        </div>
        <div className="filter-row">
          <label className="filter-label" htmlFor="min-citations">
            At least
          </label>
          <input
            id="min-citations"
            className="input input-narrow"
            type="number"
            min={0}
            step={1}
            value={filters.minCitations}
            onChange={(event) =>
              setFilters({ minCitations: Number(event.target.value) || 0 })
            }
          />
        </div>
        <label className="checkbox-row" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={filters.includeUnknownCitations}
            onChange={(event) =>
              setFilters({ includeUnknownCitations: event.target.checked })
            }
          />
          <span>Include unknown citation counts</span>
        </label>
        <p className="filter-help">
          Citation counts are indexed counts, not a quality rating.
        </p>
      </div>

      <div className="filter-group">
        <div className="filter-group-title">
          Text similarity
          <span className="filter-count-inline">local</span>
        </div>
        <div className="slider-row">
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(filters.minSimilarity * 100)}
            onChange={(event) =>
              setFilters({ minSimilarity: Number(event.target.value) / 100 })
            }
            aria-label="Minimum text similarity"
            aria-valuetext={`${Math.round(filters.minSimilarity * 100)} percent`}
          />
          <span className="slider-value">
            {filters.minSimilarity.toFixed(2)}
          </span>
        </div>
        <label className="checkbox-row" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={filters.includeUnavailableSimilarity}
            onChange={(event) =>
              setFilters({
                includeUnavailableSimilarity: event.target.checked,
              })
            }
          />
          <span>Include unavailable similarity</span>
        </label>
        <p className="filter-help">{SIMILARITY_HELP}</p>
      </div>

      <div className="filter-group">
        <div className="filter-group-title">Loaded text</div>
        <input
          className="input"
          type="search"
          value={filters.text}
          placeholder="Filter loaded title, authors, venue"
          aria-label="Filter loaded papers by text"
          onChange={(event) => setFilters({ text: event.target.value })}
        />
        <p className="filter-help">
          Matches loaded records only. It never issues an upstream search.
        </p>
      </div>

      <p className="filter-summary" aria-live="polite">
        <strong>{visible.neighbors.length}</strong> of{" "}
        <strong>{loadedNeighbors.length}</strong> loaded neighbors visible.
        {filters.relationships.length === 0 ? " The center remains visible." : ""}
        {active ? " Filtered view." : " No filters active."}
      </p>
    </aside>
  );
}
