"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useExplorerStore } from "@/lib/state/explorer";

export function GraphLegend() {
  const layout = useExplorerStore((state) => state.layout);
  const [open, setOpen] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  if (!open) {
    return (
      <div className="legend">
        <button
          type="button"
          className="legend-toggle"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          Legend
          <ChevronUp size={12} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="legend" aria-label="Graph legend">
      <button
        type="button"
        className="legend-toggle"
        aria-expanded={true}
        onClick={() => setOpen(false)}
      >
        Legend
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      <div className="legend-grid" style={{ marginTop: 6 }}>
        <span className="legend-row">
          <span className="legend-swatch ring" aria-hidden="true" />
          Center paper
        </span>
        <span className="legend-row">
          <span className="legend-swatch" style={{ background: "var(--ref)" }} aria-hidden="true" />
          Reference
        </span>
        <span className="legend-row">
          <span className="legend-swatch" style={{ background: "var(--cite)" }} aria-hidden="true" />
          Citing
        </span>
        <span className="legend-row">
          <span className="legend-swatch" style={{ background: "var(--rec)" }} aria-hidden="true" />
          Recommended
        </span>
        <span className="legend-row">
          <span
            className="legend-swatch"
            style={{
              background: "transparent",
              border: "1.5px solid var(--text)",
            }}
            aria-hidden="true"
          />
          Multiple
        </span>
        <span className="legend-row">
          <span className="legend-line arrow" aria-hidden="true" />
          Citation
        </span>
        <span className="legend-row">
          <span className="legend-line dashed" aria-hidden="true" />
          Recommendation
        </span>
        <span className="legend-row">
          <span className="legend-swatch" style={{ background: "#7d8ca4" }} aria-hidden="true" />
          Size = citations
        </span>
      </div>
      <div className="legend-note">
        {layout === "similarity-radius"
          ? "Radius encodes local text similarity to the center. Angles and peripheral distances are arrangement only, not topic clusters."
          : "Even-shell layout places every neighbor at the same radius for arrangement only. Scores remain in the details and list."}
        {reducedMotion ? " Reduced motion is on." : ""}
      </div>
    </div>
  );
}
