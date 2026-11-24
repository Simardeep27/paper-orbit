"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { OrbitNode } from "@/lib/types";
import {
  RELATIONSHIP_LABELS,
} from "@/lib/types";
import { useExplorerStore } from "@/lib/state/explorer";
import {
  buildSceneModel,
  createCitationSizeScale,
  svgRadiusForCount,
} from "@/lib/graph/layout";
import {
  formatScore,
  formatYear,
  getCenterNode,
  getNodeById,
  getVisibleNeighborhood,
  sortNeighborNodes,
} from "@/lib/graph/selectors";
import { PaperTooltip } from "@/components/PaperTooltip";
import { useElementSize } from "@/components/useElementSize";

export interface RadialGraphHandle {
  getSvgElement: () => SVGSVGElement | null;
  fit: () => void;
}

interface RadialGraphProps {
  showCitations: boolean;
  showRecommendations: boolean;
  resetCameraNonce: number;
  locateNonce: number;
}

interface Point {
  x: number;
  y: number;
}

const COLOR: Record<string, string> = {
  reference: "#5dd6f4",
  citing: "#f6be5a",
  recommended: "#b69cff",
};

function colorFor(node: OrbitNode): string {
  if (node.memberships.length > 1) return "#f3f5fa";
  return COLOR[node.memberships[0] ?? "reference"] ?? "#b0bcd0";
}

function ariaLabel(node: OrbitNode, isCenter: boolean): string {
  const pieces = [
    node.paper.title,
    formatYear(node.paper.year),
    isCenter ? "center paper" : node.memberships.map((m) => RELATIONSHIP_LABELS[m]).join(", "),
    node.paper.citationCount === null
      ? "citation count unknown"
      : `${node.paper.citationCount} citations`,
    node.textSimilarity === null
      ? "text score unavailable"
      : `text score ${formatScore(node.textSimilarity)}`,
  ];
  return pieces.join(". ");
}

function trimLabel(value: string, max = 42): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export const RadialGraph = forwardRef<RadialGraphHandle, RadialGraphProps>(
  function RadialGraph(
    { showCitations, showRecommendations, resetCameraNonce, locateNonce },
    ref,
  ) {
    const neighborhood = useExplorerStore((state) => state.neighborhood);
    const layout = useExplorerStore((state) => state.layout);
    const filters = useExplorerStore((state) => state.filters);
    const selectedPaperId = useExplorerStore((state) => state.selectedPaperId);
    const compareIds = useExplorerStore((state) => state.compareIds);
    const selectPaper = useExplorerStore((state) => state.selectPaper);
    const setHoveredPaper = useExplorerStore((state) => state.setHoveredPaper);
    const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
    const svgRef = useRef<SVGSVGElement>(null);
    const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
    const [tooltip, setTooltip] = useState<{
      id: string;
      left: number;
      top: number;
    } | null>(null);
    const dragRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      moved: boolean;
    } | null>(null);

    const scene = useMemo(
      () => (neighborhood ? buildSceneModel(neighborhood, layout) : null),
      [neighborhood, layout],
    );
    const citationScale = useMemo(
      () => (scene ? createCitationSizeScale(scene) : null),
      [scene],
    );

    useImperativeHandle(
      ref,
      () => ({
        getSvgElement: () => svgRef.current,
        fit: () => setZoom({ scale: 1, x: 0, y: 0 }),
      }),
      [],
    );

    useEffect(() => {
      setZoom({ scale: 1, x: 0, y: 0 });
    }, [resetCameraNonce, layout, neighborhood?.centerId]);

    useEffect(() => {
      if (locateNonce === 0 || !selectedPaperId) return;
      const position = scene?.positions.get(selectedPaperId);
      if (!position) return;
      const scale = 1.6;
      setZoom({
        scale,
        x: -position.radius * Math.cos(position.angle) * scale,
        y: -position.radius * Math.sin(position.angle) * scale,
      });
    }, [locateNonce, scene, selectedPaperId]);

    useEffect(() => {
      return () => setHoveredPaper(null);
    }, [setHoveredPaper]);

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        const rect = svg.getBoundingClientRect();
        const aspect =
          rect.height > 0 ? rect.width / rect.height : 1.6;
        const baseHalf = 14.4;
        const halfWidth = aspect >= 1 ? baseHalf * aspect : baseHalf;
        const halfHeight = aspect >= 1 ? baseHalf : baseHalf / Math.max(0.45, aspect);
        const viewX =
          -halfWidth + ((event.clientX - rect.left) / rect.width) * halfWidth * 2;
        const viewY =
          -halfHeight +
          ((event.clientY - rect.top) / rect.height) * halfHeight * 2;
        setZoom((current) => {
          const factor = event.deltaY < 0 ? 1.14 : 0.88;
          const nextScale = Math.min(4, Math.max(0.55, current.scale * factor));
          const worldX = (viewX - current.x) / current.scale;
          const worldY = (viewY - current.y) / current.scale;
          return {
            scale: nextScale,
            x: viewX - worldX * nextScale,
            y: viewY - worldY * nextScale,
          };
        });
      };
      svg.addEventListener("wheel", handleWheel, { passive: false });
      return () => svg.removeEventListener("wheel", handleWheel);
    }, []);

    if (!neighborhood || !scene || !citationScale) {
      return <div className="scene-loading">Preparing the 2D map…</div>;
    }

    const visible = getVisibleNeighborhood(neighborhood, filters);
    const center = getCenterNode(neighborhood);
    const selectedNode = getNodeById(neighborhood, selectedPaperId);
    const aspect =
      size.height > 0 ? size.width / size.height : 1.6;
    const baseHalf = 14.4;
    const halfWidth =
      aspect >= 1 ? baseHalf * aspect : baseHalf;
    const halfHeight =
      aspect >= 1 ? baseHalf : baseHalf / Math.max(0.45, aspect);
    const viewBox = `${-halfWidth} ${-halfHeight} ${halfWidth * 2} ${
      halfHeight * 2
    }`;
    const labelCandidates = [
      center,
      selectedNode,
      ...sortNeighborNodes(visible.neighbors, "similarity").slice(0, 6),
    ].filter((node): node is OrbitNode => Boolean(node));
    const labelIds = new Set(labelCandidates.map((node) => node.paper.id));

    function pointFor(id: string): Point | null {
      const position = scene?.positions.get(id);
      if (!position) return null;
      return {
        x: position.radius * Math.cos(position.angle),
        y: position.radius * Math.sin(position.angle),
      };
    }

    function handleNodePointerMove(
      event: ReactPointerEvent<SVGGElement>,
      node: OrbitNode,
    ) {
      if (dragRef.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(280, Math.max(240, rect.width * 0.5));
      const left = Math.min(
        Math.max(6, event.clientX - rect.left + 14),
        Math.max(6, rect.width - width - 8),
      );
      const top = Math.min(
        Math.max(6, event.clientY - rect.top + 14),
        Math.max(6, rect.height - 174),
      );
      setTooltip({ id: node.paper.id, left, top });
      setHoveredPaper(node.paper.id);
    }

    function clearTooltip() {
      setTooltip(null);
      setHoveredPaper(null);
    }

    function handleNodeKeyDown(
      event: KeyboardEvent<SVGGElement>,
      node: OrbitNode,
    ) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPaper(node.paper.id);
      }
    }

    function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
      if ((event.target as Element).closest?.("[data-node]")) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: zoom.x,
        originY: zoom.y,
        moved: false,
      };
    }

    function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      const rect = event.currentTarget.getBoundingClientRect();
      const aspect = rect.height > 0 ? rect.width / rect.height : 1.6;
      const baseHalf = 14.4;
      const halfWidth = aspect >= 1 ? baseHalf * aspect : baseHalf;
      const halfHeight = aspect >= 1 ? baseHalf : baseHalf / Math.max(0.45, aspect);
      setZoom((current) => ({
        ...current,
        x:
          drag.originX +
          ((dx / Math.max(1, rect.width)) * halfWidth * 2) / current.scale,
        y:
          drag.originY +
          ((dy / Math.max(1, rect.height)) * halfHeight * 2) / current.scale,
      }));
    }

    function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const moved = drag.moved;
      dragRef.current = null;
      if (!moved && !(event.target as Element).closest?.("[data-node]")) {
        selectPaper(null);
      }
    }

    function preventWheelBubble(event: ReactWheelEvent<SVGSVGElement>) {
      event.stopPropagation();
    }

    const hoveredNode = tooltip
      ? getNodeById(neighborhood, tooltip.id)
      : undefined;

    return (
      <div className="radial-scene" ref={containerRef}>
        <svg
          ref={svgRef}
          className="radial-svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="Radial 2D map of the loaded paper neighborhood. Papers are positioned by radius and a deterministic angle. Use the paper list for a fully keyboard-ordered equivalent."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={preventWheelBubble}
          onPointerLeave={() => {
            dragRef.current = null;
            clearTooltip();
          }}
        >
          <defs>
            <marker
              id="radial-citation-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6f83a2" />
            </marker>
            <marker
              id="radial-citation-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ed4ff" />
            </marker>
          </defs>

          <g transform={`translate(${zoom.x} ${zoom.y}) scale(${zoom.scale})`}>
            <g aria-hidden="true">
              <circle
                r={11.5}
                fill="none"
                stroke="#30405b"
                strokeOpacity="0.5"
                strokeDasharray="2 5"
              />
              {layout === "similarity-radius" ? (
                <>
                  <circle
                    r={3}
                    fill="none"
                    stroke="#30405b"
                    strokeOpacity="0.24"
                  />
                  <circle
                    r={6.5}
                    fill="none"
                    stroke="#30405b"
                    strokeOpacity="0.24"
                    strokeDasharray="3 6"
                  />
                  <circle
                    r={10}
                    fill="none"
                    stroke="#30405b"
                    strokeOpacity="0.24"
                  />
                  <text
                    x={6.7}
                    y={-6.7}
                    fill="#6f7f98"
                    fontSize="0.34"
                    transform="rotate(-28 6.7 -6.7)"
                  >
                    similarity radius
                  </text>
                </>
              ) : (
                <circle
                  r={8}
                  fill="none"
                  stroke="#30405b"
                  strokeOpacity="0.42"
                />
              )}
            </g>

            {showRecommendations
              ? neighborhood.recommendations.map((link) => {
                  if (
                    !visible.visibleIds.has(link.source) ||
                    !visible.visibleIds.has(link.target)
                  ) {
                    return null;
                  }
                  const source = pointFor(link.source);
                  const target = pointFor(link.target);
                  if (!source || !target) return null;
                  const active =
                    selectedPaperId === link.source ||
                    selectedPaperId === link.target;
                  return (
                    <line
                      key={link.id}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={active ? "#b69cff" : "#7a6b9d"}
                      strokeOpacity={active ? 0.9 : 0.32}
                      strokeWidth={active ? 0.055 : 0.03}
                      strokeDasharray="0.18 0.16"
                      pointerEvents="none"
                    >
                      <title>
                        Recommendation association (rank {link.rank}); not a
                        citation.
                      </title>
                    </line>
                  );
                })
              : null}

            {showCitations
              ? visible.edges.map((edge) => {
                  if (
                    !visible.visibleIds.has(edge.source) ||
                    !visible.visibleIds.has(edge.target)
                  ) {
                    return null;
                  }
                  const source = pointFor(edge.source);
                  const target = pointFor(edge.target);
                  if (!source || !target) return null;
                  const dx = target.x - source.x;
                  const dy = target.y - source.y;
                  const length = Math.hypot(dx, dy);
                  if (length < 0.001) return null;
                  const targetNode = getNodeById(neighborhood, edge.target);
                  const targetRadius = targetNode
                    ? svgRadiusForCount(
                        targetNode.paper.citationCount,
                        citationScale,
                      )
                    : 0.4;
                  const trim = (targetRadius + 0.18) / length;
                  const x2 = target.x - dx * trim;
                  const y2 = target.y - dy * trim;
                  const active =
                    selectedPaperId === edge.source ||
                    selectedPaperId === edge.target;
                  return (
                    <line
                      key={edge.id}
                      x1={source.x}
                      y1={source.y}
                      x2={x2}
                      y2={y2}
                      stroke={active ? "#9ed4ff" : "#6f83a2"}
                      strokeOpacity={active ? 0.9 : 0.3}
                      strokeWidth={active ? 0.07 : 0.035}
                      markerEnd={`url(#radial-citation-arrow${
                        active ? "-active" : ""
                      })`}
                      pointerEvents="none"
                    >
                      <title>
                        Citation:{" "}
                        {getNodeById(neighborhood, edge.source)?.paper.title ??
                          edge.source}{" "}
                        cites{" "}
                        {getNodeById(neighborhood, edge.target)?.paper.title ??
                          edge.target}
                      </title>
                    </line>
                  );
                })
              : null}

            {visible.nodes.map((node) => {
              const point = pointFor(node.paper.id);
              if (!point) return null;
              const isCenter = node.paper.id === neighborhood.centerId;
              const radius = isCenter
                ? 0.72
                : svgRadiusForCount(node.paper.citationCount, citationScale);
              const selected = selectedPaperId === node.paper.id;
              const compared = compareIds.includes(node.paper.id);
              const color = isCenter ? "#f3f5fa" : colorFor(node);
              const unknownCitations =
                !isCenter && node.paper.citationCount === null;
              const hitRadius = Math.max(radius + 0.4, 0.9);
              return (
                <g
                  key={node.paper.id}
                  data-node
                  transform={`translate(${point.x} ${point.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={ariaLabel(node, isCenter)}
                  aria-pressed={selected}
                  style={{ cursor: "pointer", outline: "none" }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerMove={(event) =>
                    handleNodePointerMove(event, node)
                  }
                  onPointerLeave={clearTooltip}
                  onFocus={(event) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const box = (
                      event.currentTarget as SVGGElement
                    ).getBoundingClientRect();
                    setTooltip({
                      id: node.paper.id,
                      left: Math.min(box.right - rect.left + 8, rect.width - 268),
                      top: Math.min(box.top - rect.top + 8, rect.height - 174),
                    });
                  }}
                  onBlur={clearTooltip}
                  onClick={(event) => {
                    event.stopPropagation();
                    selectPaper(node.paper.id);
                  }}
                  onKeyDown={(event) => handleNodeKeyDown(event, node)}
                >
                  <title>{ariaLabel(node, isCenter)}</title>
                  {isCenter ? (
                    <>
                      <circle
                        r={radius + 0.55}
                        fill="#5dd6f4"
                        opacity="0.12"
                      />
                      <circle
                        r={radius + 0.34}
                        fill="none"
                        stroke="#f3f5fa"
                        strokeOpacity="0.55"
                        strokeWidth="0.04"
                      />
                    </>
                  ) : null}
                  {selected || compared ? (
                    <circle
                      r={radius + 0.22}
                      fill="none"
                      stroke={selected ? "#9ed4ff" : "#b69cff"}
                      strokeWidth="0.075"
                      strokeDasharray={compared && !selected ? "0.12 0.08" : undefined}
                    />
                  ) : null}
                  <circle
                    r={radius}
                    fill={unknownCitations ? "none" : color}
                    stroke={color}
                    strokeWidth={unknownCitations ? 0.06 : isCenter ? 0.04 : 0}
                    opacity={unknownCitations ? 0.9 : 0.94}
                  />
                  {node.memberships.length > 1 && !unknownCitations ? (
                    <circle
                      r={Math.max(radius * 0.55, 0.1)}
                      fill="#0b1020"
                      opacity="0.35"
                    />
                  ) : null}
                  <circle r={hitRadius} fill="transparent" />
                </g>
              );
            })}

            <g className="radial-labels" aria-hidden="true">
              {visible.nodes
                .filter((node) => labelIds.has(node.paper.id))
                .map((node) => {
                  const point = pointFor(node.paper.id);
                  if (!point) return null;
                  const isCenter = node.paper.id === neighborhood.centerId;
                  const radius = isCenter
                    ? 0.72
                    : svgRadiusForCount(node.paper.citationCount, citationScale);
                  const selected = selectedPaperId === node.paper.id;
                  return (
                    <text
                      key={`label-${node.paper.id}`}
                      x={point.x + radius + 0.22}
                      y={point.y + (isCenter ? 0.55 : 0.12)}
                      className={`radial-label${
                        selected ? " radial-label-selected" : ""
                      }${isCenter ? " radial-label-center" : ""}`}
                    >
                      {trimLabel(node.paper.title, isCenter ? 46 : 34)}
                    </text>
                  );
                })}
            </g>
          </g>
        </svg>

        {tooltip && hoveredNode ? (
          <PaperTooltip
            node={hoveredNode}
            left={tooltip.left}
            top={tooltip.top}
          />
        ) : null}

        <p className="canvas-instructions">
          Drag to pan · scroll to zoom · select a node for details
        </p>
      </div>
    );
  },
);
