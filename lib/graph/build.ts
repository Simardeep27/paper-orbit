import type { Neighborhood } from "@/lib/types";
import { neighborhoodSchema } from "@/lib/schemas";
import {
  assembleNeighborhood,
  type AssembleInput,
} from "@/lib/graph/normalize";

/**
 * Build a canonical neighborhood. Assembly is pure; provider I/O lives in
 * lib/providers and route handlers.
 */
export function buildNeighborhood(input: AssembleInput): Neighborhood {
  return assembleNeighborhood(input);
}

export interface NeighborhoodInvariantReport {
  ok: boolean;
  problems: string[];
}

/** Defensive checks used by tests and the demo fixture loader. */
export function checkNeighborhoodInvariants(
  neighborhood: Neighborhood,
): NeighborhoodInvariantReport {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const node of neighborhood.nodes) {
    if (ids.has(node.paper.id)) {
      problems.push(`Duplicate node ${node.paper.id}`);
    }
    ids.add(node.paper.id);
  }
  if (!ids.has(neighborhood.centerId)) {
    problems.push("Center node is missing");
  }
  if (neighborhood.nodes.length > 150) {
    problems.push("Neighborhood exceeds the 150-node renderer guard");
  }
  const edgeKeys = new Set<string>();
  for (const edge of neighborhood.edges) {
    if (edge.source === edge.target) {
      problems.push(`Self citation edge ${edge.id}`);
    }
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      problems.push(`Dangling citation edge ${edge.id}`);
    }
    const key = `${edge.source}->${edge.target}`;
    if (edgeKeys.has(key)) problems.push(`Duplicate citation edge ${key}`);
    edgeKeys.add(key);
  }
  const recommendationKeys = new Set<string>();
  for (const link of neighborhood.recommendations) {
    if (!ids.has(link.source) || !ids.has(link.target)) {
      problems.push(`Dangling recommendation link ${link.id}`);
    }
    if (recommendationKeys.has(`${link.source}->${link.target}`)) {
      problems.push(`Duplicate recommendation link ${link.id}`);
    }
    recommendationKeys.add(`${link.source}->${link.target}`);
    if (link.source !== neighborhood.centerId) {
      problems.push(`Recommendation ${link.id} does not start at center`);
    }
  }
  if (!neighborhood.nodes.some((node) => node.paper.id === neighborhood.centerId)) {
    problems.push("Center node missing after node scan");
  }
  return { ok: problems.length === 0, problems };
}

export function parseNeighborhoodFixture(value: unknown): Neighborhood {
  const parsed = neighborhoodSchema.parse(value);
  const report = checkNeighborhoodInvariants(parsed);
  if (!report.ok) {
    throw new Error(
      `Invalid neighborhood fixture: ${report.problems.join("; ")}`,
    );
  }
  return parsed as Neighborhood;
}
