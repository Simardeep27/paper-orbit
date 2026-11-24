"use client";

import type { OrbitNode } from "@/lib/types";
import { formatAuthors, formatSimilarity } from "@/lib/format";
import { formatCitations, formatYear } from "@/lib/graph/selectors";
import { PaperBadges } from "@/components/PaperBadges";

interface PaperTooltipProps {
  node: OrbitNode;
  left: number;
  top: number;
  id?: string;
}

export function PaperTooltip({ node, left, top, id }: PaperTooltipProps) {
  return (
    <div
      className="scene-tooltip"
      style={{ left, top }}
      role="tooltip"
      id={id}
    >
      <div className="tooltip-title">{node.paper.title}</div>
      <div className="tooltip-meta">
        {formatAuthors(node.paper, { limit: 2 })} · {formatYear(node.paper.year)}
      </div>
      <div className="tooltip-badges">
        <PaperBadges memberships={node.memberships} />
      </div>
      <div className="tooltip-stats">
        <span>
          Citations <strong>{formatCitations(node.paper.citationCount)}</strong>
        </span>
        <span>
          Text score{" "}
          <strong>
            {formatSimilarity(
              node.textSimilarity,
              node.similarityCoverage,
            )}
          </strong>
        </span>
      </div>
    </div>
  );
}
