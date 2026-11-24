import type {
  OrbitNode,
  Paper,
  SimilarityCoverage,
  SimilarityRun,
} from "@/lib/types";

/**
 * A small, committed English stopword list. Tokens shorter than two
 * characters are also discarded, which removes some short technical terms
 * (for example "AI" or "ML"). This limitation is documented in the UI.
 */
const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be
  because been before being below between both but by can cannot could
  couldn't did didn't do does doesn't doing don't down during each few for
  from further had hadn't has hasn't have haven't having he he'd he'll he's
  her here here's hers herself him himself his how how's i i'd i'll i'm i've
  if in into is isn't it it's its itself let's me more most mustn't my myself
  no nor not of off on once only or other ought our ours ourselves out over
  own same shan't she she'd she'll she's should shouldn't so some such than
  that that's the their theirs them themselves then there there's these they
  they'd they'll they're they've this those through to too under until up
  very was wasn't we we'd we'll we're we've were weren't what what's when
  when's where where's which while who who's whom why why's with won't would
  wouldn't you you'd you'll you're you've your yours yourself yourselves`
    .split(/\s+/)
    .filter(Boolean),
);

const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
export const TITLE_UNAVAILABLE = "Title unavailable.";

export interface SimilarityScore {
  score: number | null;
  coverage: SimilarityCoverage;
}

export interface SimilarityResult {
  scores: Map<string, SimilarityScore>;
  meta: SimilarityRun;
}

export function normalizeUnicode(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

export function tokenize(value: string): string[] {
  const matches = normalizeUnicode(value).match(TOKEN_PATTERN) ?? [];
  return matches.filter(
    (token) => token.length >= 2 && !STOPWORDS.has(token),
  );
}

export function documentText(paper: Paper): string {
  const parts: string[] = [];
  const title =
    paper.title === TITLE_UNAVAILABLE ? "" : paper.title.trim();
  if (title) {
    // Repeating the title gives it modest additional weight.
    parts.push(title, title);
  }
  const abstract = paper.abstract?.trim();
  if (abstract) parts.push(abstract);
  return parts.join(" ");
}

function coverageFor(center: Paper, candidate: Paper): SimilarityCoverage {
  const centerHasText =
    center.title !== TITLE_UNAVAILABLE || Boolean(center.abstract?.trim());
  const candidateHasText =
    candidate.title !== TITLE_UNAVAILABLE ||
    Boolean(candidate.abstract?.trim());
  if (!centerHasText || !candidateHasText) return "unavailable";
  return center.abstract?.trim() && candidate.abstract?.trim()
    ? "title+abstract"
    : "title-only";
}

interface Vector {
  weights: Map<string, number>;
  norm: number;
}

function buildVector(termCounts: Map<string, number>, idf: Map<string, number>): Vector {
  const weights = new Map<string, number>();
  let sumSquares = 0;
  for (const [term, count] of termCounts) {
    const weight = count * (idf.get(term) ?? 1);
    if (weight <= 0) continue;
    weights.set(term, weight);
    sumSquares += weight * weight;
  }
  return { weights, norm: Math.sqrt(sumSquares) };
}

function dot(a: Vector, b: Vector): number {
  // Iterate the smaller map.
  const [small, large] =
    a.weights.size <= b.weights.size
      ? [a.weights, b.weights]
      : [b.weights, a.weights];
  let total = 0;
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other !== undefined) total += weight * other;
  }
  return total;
}

/**
 * Local TF-IDF cosine similarity between the center and every loaded
 * neighbor. Values are corpus-dependent and therefore frozen per
 * neighborhood. Empty/zero vectors produce null, never an invented score.
 */
export function computeSimilarity(
  center: Paper,
  neighbors: Paper[],
  computedAt = new Date().toISOString(),
): SimilarityResult {
  const unique = new Map<string, Paper>();
  unique.set(center.id, center);
  for (const paper of neighbors) {
    if (paper.id !== center.id && !unique.has(paper.id)) {
      unique.set(paper.id, paper);
    }
  }

  const documents = [...unique.values()]
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((paper) => ({
      id: paper.id,
      paper,
      tokens: tokenize(documentText(paper)),
    }));

  const documentCount = documents.length;
  const df = new Map<string, number>();
  for (const doc of documents) {
    for (const term of new Set(doc.tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((1 + documentCount) / (1 + count)) + 1);
  }

  const vectors = new Map<string, Vector>();
  for (const doc of documents) {
    const counts = new Map<string, number>();
    for (const term of doc.tokens) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
    vectors.set(doc.id, buildVector(counts, idf));
  }

  const centerVector = vectors.get(center.id);
  const scores = new Map<string, SimilarityScore>();
  for (const doc of documents) {
    if (doc.id === center.id) {
      scores.set(doc.id, { score: null, coverage: "unavailable" });
      continue;
    }
    const vector = vectors.get(doc.id);
    const coverage = coverageFor(center, doc.paper);
    if (
      !centerVector ||
      !vector ||
      centerVector.norm === 0 ||
      vector.norm === 0
    ) {
      scores.set(doc.id, { score: null, coverage });
      continue;
    }
    const cosine = dot(centerVector, vector) / (centerVector.norm * vector.norm);
    const clamped = Math.min(1, Math.max(0, cosine));
    scores.set(doc.id, { score: clamped, coverage });
  }

  return {
    scores,
    meta: {
      algorithm: "tfidf-cosine",
      version: "1.0.0",
      corpusIds: documents.map((doc) => doc.id),
      computedAt,
    },
  };
}

export function applySimilarity(nodes: OrbitNode[], center: Paper): SimilarityResult {
  const result = computeSimilarity(
    center,
    nodes.filter((node) => node.paper.id !== center.id).map((node) => node.paper),
    new Date().toISOString(),
  );
  for (const node of nodes) {
    if (node.paper.id === center.id) {
      node.textSimilarity = null;
      node.similarityCoverage = "unavailable";
      continue;
    }
    const score = result.scores.get(node.paper.id);
    node.textSimilarity = score?.score ?? null;
    node.similarityCoverage = score?.coverage ?? "unavailable";
  }
  return result;
}
