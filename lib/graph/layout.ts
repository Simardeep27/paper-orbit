import type {
  LayoutMode,
  LayoutPosition,
  Neighborhood,
  OrbitNode,
  SceneModel,
} from "@/lib/types";

const TWO_PI = Math.PI * 2;

/** cyrb128: a small seeded string hash with well-distributed 32-bit output. */
function cyrb128(input: string, seed = 0): number {
  let h1 = 1779033703 ^ seed;
  let h2 = 3144134277 ^ seed;
  let h3 = 1013904242 ^ seed;
  let h4 = 2773480762 ^ seed;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
}

function unitFromId(id: string, salt: number): number {
  return (cyrb128(id, salt) + 0.5) / 4_294_967_296;
}

export interface UnitDirection {
  x: number;
  y: number;
  z: number;
  /** Deterministic azimuth used by the 2D radial projection. */
  angle: number;
}

/** Stable, well-distributed unit vector derived only from the canonical ID. */
export function deterministicDirection(id: string): UnitDirection {
  const u = unitFromId(id, 0x9e3779b9);
  const v = unitFromId(id, 0x85ebca6b);
  const z = 1 - 2 * u;
  const phi = TWO_PI * v;
  const radial = Math.sqrt(Math.max(0, 1 - z * z));
  return {
    x: radial * Math.cos(phi),
    y: z,
    z: radial * Math.sin(phi),
    angle: phi,
  };
}

export function radiusForNode(node: OrbitNode, layout: LayoutMode): number {
  if (layout === "even-shell") return 8;
  const score = node.textSimilarity;
  if (score === null || !Number.isFinite(score)) return 11.5;
  return 3 + 7 * (1 - Math.min(1, Math.max(0, score)));
}

/**
 * Derive the scene layout from the full loaded neighborhood, before UI
 * filters. Filters never relayout nodes. Unknown similarity is placed on a
 * visibly distinct outer shell rather than imputed.
 */
export function buildSceneModel(
  neighborhood: Neighborhood,
  layout: LayoutMode,
): SceneModel {
  const positions = new Map<string, LayoutPosition>();
  let minSimilarity: number | null = null;
  let maxSimilarity: number | null = null;
  let citationMin = 0;
  let citationMax = 0;
  let haveCitations = false;

  for (const node of neighborhood.nodes) {
    const direction = deterministicDirection(node.paper.id);
    const radius =
      node.paper.id === neighborhood.centerId
        ? 0
        : radiusForNode(node, layout);
    positions.set(node.paper.id, {
      id: node.paper.id,
      x: radius === 0 ? 0 : direction.x * radius,
      y: radius === 0 ? 0 : direction.y * radius,
      z: radius === 0 ? 0 : direction.z * radius,
      radius,
      angle: direction.angle,
    });

    if (node.paper.id !== neighborhood.centerId) {
      if (node.textSimilarity !== null) {
        minSimilarity =
          minSimilarity === null
            ? node.textSimilarity
            : Math.min(minSimilarity, node.textSimilarity);
        maxSimilarity =
          maxSimilarity === null
            ? node.textSimilarity
            : Math.max(maxSimilarity, node.textSimilarity);
      }
      const count = node.paper.citationCount;
      if (count !== null) {
        citationMin = haveCitations ? Math.min(citationMin, count) : count;
        citationMax = haveCitations ? Math.max(citationMax, count) : count;
        haveCitations = true;
      }
    }
  }

  if (!haveCitations) {
    citationMin = 0;
    citationMax = 0;
  }

  return {
    layout,
    positions,
    minSimilarity,
    maxSimilarity,
    citationMin,
    citationMax,
  };
}

export interface CitationSizeScale {
  min: number;
  max: number;
  radiusFor: (count: number | null) => number | null;
}

/**
 * Log1p citation encoding, frozen for the loaded neighborhood. Unknown
 * counts return null so the renderers can use a distinct hollow glyph.
 */
export function createCitationSizeScale(scene: SceneModel): CitationSizeScale {
  const min = scene.citationMin;
  const max = scene.citationMax;
  const span = Math.log1p(max) - Math.log1p(min);
  return {
    min,
    max,
    radiusFor(count) {
      if (count === null || !Number.isFinite(count)) return null;
      if (span <= 0) return 0.17;
      const ratio = (Math.log1p(Math.max(0, count)) - Math.log1p(min)) / span;
      return 0.1 + 0.18 * Math.min(1, Math.max(0, ratio));
    },
  };
}

/** SVG radius in viewBox units for the 2D projection. */
export function svgRadiusForCount(
  count: number | null,
  scale: CitationSizeScale,
): number {
  const world = scale.radiusFor(count);
  return world === null ? 0.22 : world * 2.4;
}
