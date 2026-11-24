"use client";

import { RotateCcw } from "lucide-react";
import { useExplorerStore } from "@/lib/state/explorer";
import { RELATIONSHIP_LABELS, SIMILARITY_HELP } from "@/lib/types";
import { Dialog } from "@/components/Dialog";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const webglFailed = useExplorerStore((state) => state.webglFailed);
  const retryWebgl = useExplorerStore((state) => state.retryWebgl);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="How to use Paper Orbit"
      description="A short guide to the views, controls, and honest limits of the neighborhood."
      footer={
        <>
          {webglFailed ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                retryWebgl();
                onClose();
              }}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Retry 3D
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="help-grid">
        <section className="help-block">
          <h3>Views</h3>
          <ul>
            <li>
              <strong>3D</strong> places the center at the origin. Radius
              encodes local text similarity; angle is only deterministic
              arrangement.
            </li>
            <li>
              <strong>2D</strong> is a real SVG radial projection with the same
              nodes, filters, and selection — not a screenshot.
            </li>
            <li>
              <strong>List</strong> gives every loaded paper in a sortable,
              keyboard-friendly table.
            </li>
            <li>
              <strong>Even shell</strong> places every neighbor at one radius for
              arrangement only; scores do not change.
            </li>
          </ul>
        </section>
        <section className="help-block">
          <h3>Interaction</h3>
          <ul>
            <li>Drag to orbit or pan. Wheel or pinch to zoom.</li>
            <li>Click a node or row to inspect it; selection never recenters.</li>
            <li>
              Use <strong>Make central paper</strong> to recenter, and{" "}
              <strong>Locate</strong> to bring the selected node into the
              foreground.
            </li>
            <li>
              Toggle citation and recommendation lines independently. Citation
              arrows point from citing paper to cited paper.
            </li>
          </ul>
        </section>
        <section className="help-block">
          <h3>Filters and the histogram</h3>
          <ul>
            <li>Relationship groups combine with OR; other filters combine with AND.</li>
            <li>
              Brush the year histogram or type inclusive year bounds. Unknown
              years are controlled explicitly.
            </li>
            <li>
              Histogram context counts exclude only the year filter, so the
              chart does not collapse into the selected interval.
            </li>
            <li>
              The loaded text filter searches only the records already in this
              neighborhood.
            </li>
          </ul>
        </section>
        <section className="help-block">
          <h3>Keyboard</h3>
          <ul>
            <li>
              <kbd>Tab</kbd> moves through all controls, SVG nodes, and list
              rows.
            </li>
            <li>
              <kbd>Enter</kbd> or <kbd>Space</kbd> selects a focused node.
            </li>
            <li>
              <kbd>/</kbd> focuses search · <kbd>?</kbd> opens this guide ·{" "}
              <kbd>Esc</kbd> closes panels and dialogs.
            </li>
            <li>
              Browser back and forward restore neighborhoods and their filters.
            </li>
          </ul>
        </section>
        <section className="help-block">
          <h3>What the marks mean</h3>
          <ul>
            <li>
              {RELATIONSHIP_LABELS.reference} = cyan;{" "}
              {RELATIONSHIP_LABELS.citing} = amber;{" "}
              {RELATIONSHIP_LABELS.recommended} = violet; multiple memberships
              use a white outline.
            </li>
            <li>
              Node size is a frozen log scale of provider citation count.
              Hollow nodes have unknown citation counts.
            </li>
            <li>
              Solid arrows are observed citations. Dashed lines are provider
              recommendation associations, never citations.
            </li>
          </ul>
        </section>
        <section className="help-block">
          <h3>Honest limits</h3>
          <p>{SIMILARITY_HELP}</p>
          <p style={{ marginTop: 6 }}>
            Papers are not geographic points, and the sphere is not a semantic
            manifold. Use the details score and list for precise comparisons.
            Provider samples are bounded; missing branches are labeled.
          </p>
        </section>
      </div>
    </Dialog>
  );
}
