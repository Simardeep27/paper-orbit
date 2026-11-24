"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { scaleBand } from "d3-scale";
import { CalendarRange, X } from "lucide-react";
import { useExplorerStore } from "@/lib/state/explorer";
import { getYearHistogram } from "@/lib/graph/selectors";
import { YearInput } from "@/components/YearInput";
import { useElementWidth } from "@/components/useElementWidth";

const CHART_HEIGHT = 74;
const MARGIN = { top: 6, right: 10, bottom: 16, left: 30 };
const UNKNOWN_WIDTH = 26;

export function YearHistogram() {
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const filters = useExplorerStore((state) => state.filters);
  const setFilters = useExplorerStore((state) => state.setFilters);
  const { ref, width } = useElementWidth<HTMLDivElement>(760);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  if (!neighborhood) return null;

  const histogram = getYearHistogram(neighborhood, filters);
  const innerWidth = Math.max(220, width - MARGIN.left - MARGIN.right);
  const yearWidth = Math.max(0, innerWidth - UNKNOWN_WIDTH - 12);
  const band = scaleBand<string>()
    .domain(histogram.bins.map((bin) => String(bin.year)))
    .range([0, yearWidth])
    .paddingInner(0.24)
    .paddingOuter(0.04);
  const barWidth = Math.max(3, Math.min(22, band.bandwidth()));
  const maxCount = Math.max(
    1,
    ...histogram.bins.map((bin) => bin.context),
    histogram.unknown.context,
  );
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  const xForYear = (year: number): number =>
    MARGIN.left + (band(String(year)) ?? 0);

  const bandStart =
    filters.yearStart !== null ? xForYear(filters.yearStart) : null;
  const lastBin =
    filters.yearEnd !== null
      ? histogram.bins.find((bin) => bin.year === filters.yearEnd)
      : undefined;
  const bandEnd =
    lastBin !== undefined && band(String(lastBin.year)) !== undefined
      ? xForYear(lastBin.year) + barWidth
      : null;

  const labelStep = Math.max(1, Math.ceil(histogram.bins.length / 8));

  function setIntervalFromPointer(clientX: number): number | null {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left - MARGIN.left;
    const hits = histogram.bins
      .map((bin) => ({
        year: bin.year,
        start: band(String(bin.year)) ?? 0,
        width: barWidth,
      }))
      .filter((entry) => x >= entry.start - 3 && x <= entry.start + entry.width + 3);
    const nearest = hits[0] ?? histogram.bins.reduce<null | {
      year: number;
      distance: number;
    }>((best, bin) => {
      const distance = Math.abs((band(String(bin.year)) ?? 0) - x);
      if (!best || distance < best.distance) return { year: bin.year, distance };
      return best;
    }, null);
    return nearest?.year ?? null;
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (histogram.bins.length === 0) return;
    const year = setIntervalFromPointer(event.clientX);
    if (year === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = year;
    setDragging(true);
    setFilters({ yearStart: year, yearEnd: year });
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging || dragStart.current === null) return;
    const year = setIntervalFromPointer(event.clientX);
    if (year === null) return;
    const start = Math.min(dragStart.current, year);
    const end = Math.max(dragStart.current, year);
    setFilters({ yearStart: start, yearEnd: end });
  }

  function endDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    setDragging(false);
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const unknownBarX = MARGIN.left + yearWidth + 12;
  const unknownHeight = (histogram.unknown.context / maxCount) * plotHeight;
  const unknownVisibleHeight =
    (histogram.unknown.visible / maxCount) * plotHeight;

  return (
    <section className="timeline-strip" aria-labelledby="histogram-heading">
      <div className="hist-head">
        <div className="hist-title">
          <h2 id="histogram-heading">Publication years</h2>
          <span>
            {histogram.visibleTotal} visible · {histogram.contextTotal} in
            current context · fetched sample only
          </span>
        </div>
        <div className="hist-controls">
          <CalendarRange size={13} aria-hidden="true" />
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
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={filters.includeUnknownYear}
              onChange={(event) =>
                setFilters({ includeUnknownYear: event.target.checked })
              }
            />
            <span>Unknown years</span>
          </label>
          {filters.yearStart !== null || filters.yearEnd !== null ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setFilters({ yearStart: null, yearEnd: null })}
            >
              <X size={12} aria-hidden="true" />
              Clear years
            </button>
          ) : null}
        </div>
      </div>

      <div className="hist-svg-wrap" ref={ref}>
        {histogram.bins.length === 0 ? (
          <div className="hist-empty">
            No known publication years in this sample.
          </div>
        ) : (
          <svg
            className="hist-svg"
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${Math.max(240, width)} ${CHART_HEIGHT}`}
            role="img"
            aria-label={`Year histogram. ${histogram.contextTotal} fetched neighbors in the current context, ${histogram.visibleTotal} visible. Brush to filter years, or use the numeric year inputs.`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {bandStart !== null && bandEnd !== null ? (
              <rect
                className="hist-band"
                x={bandStart - 2}
                y={MARGIN.top}
                width={Math.max(4, bandEnd - bandStart + 4)}
                height={plotHeight}
                rx={3}
              />
            ) : null}

            {histogram.bins.map((bin, index) => {
              const x = MARGIN.left + (band(String(bin.year)) ?? 0);
              const contextHeight = (bin.context / maxCount) * plotHeight;
              const visibleHeight = (bin.visible / maxCount) * plotHeight;
              const showLabel =
                index === 0 ||
                index === histogram.bins.length - 1 ||
                index % labelStep === 0;
              return (
                <g key={bin.year}>
                  <rect
                    className="hist-bar-context"
                    x={x}
                    y={MARGIN.top + plotHeight - contextHeight}
                    width={barWidth}
                    height={Math.max(1, contextHeight)}
                    rx={1.5}
                  >
                    <title>
                      {bin.year}: {bin.context} in context, {bin.visible} visible
                    </title>
                  </rect>
                  <rect
                    className="hist-bar-visible"
                    x={x}
                    y={MARGIN.top + plotHeight - visibleHeight}
                    width={barWidth}
                    height={visibleHeight}
                    rx={1.5}
                    pointerEvents="none"
                  />
                  {showLabel ? (
                    <text
                      className="hist-axis-text"
                      x={x + barWidth / 2}
                      y={CHART_HEIGHT - 3}
                      textAnchor="middle"
                    >
                      {bin.year}
                    </text>
                  ) : null}
                </g>
              );
            })}

            <g
              role="button"
              tabIndex={0}
              aria-label={`Unknown year: ${histogram.unknown.context} in context, ${histogram.unknown.visible} visible. Toggle inclusion of unknown years.`}
              onClick={() =>
                setFilters({
                  includeUnknownYear: !filters.includeUnknownYear,
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setFilters({
                    includeUnknownYear: !filters.includeUnknownYear,
                  });
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                className="hist-bar-unknown"
                x={unknownBarX}
                y={MARGIN.top + plotHeight - unknownHeight}
                width={UNKNOWN_WIDTH}
                height={Math.max(1, unknownHeight)}
                rx={2}
                opacity={filters.includeUnknownYear ? 0.7 : 0.25}
              >
                <title>
                  Unknown year: {histogram.unknown.context} in context,{" "}
                  {histogram.unknown.visible} visible
                </title>
              </rect>
              <rect
                x={unknownBarX}
                y={MARGIN.top + plotHeight - unknownVisibleHeight}
                width={UNKNOWN_WIDTH}
                height={unknownVisibleHeight}
                fill="var(--cite)"
                opacity={0.92}
                pointerEvents="none"
              />
              <text
                className="hist-axis-text"
                x={unknownBarX + UNKNOWN_WIDTH / 2}
                y={CHART_HEIGHT - 3}
                textAnchor="middle"
              >
                ?
              </text>
            </g>
          </svg>
        )}
      </div>
    </section>
  );
}
