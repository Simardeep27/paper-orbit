export type IdentifierKind = "doi" | "arxiv" | "s2" | "query";

export interface CanonicalIdentifier {
  kind: IdentifierKind;
  /** Provider-ready canonical ID for non-query kinds, or the search text. */
  value: string;
}

/**
 * Recognizes DOI and arXiv identifiers, including URL forms, and canonical
 * Semantic Scholar IDs. Plain text remains a search query. Arbitrary URLs are
 * never fetched.
 */
export function canonicalizeIdentifier(input: string): CanonicalIdentifier {
  const value = input.trim();
  const lower = value.toLowerCase();

  let doiCandidate: string | null = null;
  if (lower.startsWith("https://doi.org/")) {
    doiCandidate = value.slice("https://doi.org/".length);
  } else if (lower.startsWith("http://doi.org/")) {
    doiCandidate = value.slice("http://doi.org/".length);
  } else if (lower.startsWith("https://dx.doi.org/")) {
    doiCandidate = value.slice("https://dx.doi.org/".length);
  } else if (lower.startsWith("http://dx.doi.org/")) {
    doiCandidate = value.slice("http://dx.doi.org/".length);
  } else if (lower.startsWith("doi:")) {
    doiCandidate = value.slice(4);
  } else if (/^10\.\d{4,9}\/\S+$/.test(value)) {
    doiCandidate = value;
  }
  if (doiCandidate) {
    try {
      doiCandidate = decodeURIComponent(doiCandidate);
    } catch {
      // Keep the original text if it is not valid percent-encoding.
    }
    return { kind: "doi", value: `DOI:${doiCandidate}` };
  }

  let arxivCandidate: string | null = null;
  const arxivUrl = value.match(
    /^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\/(.+?)(?:\.pdf)?$/i,
  );
  if (arxivUrl) {
    arxivCandidate = arxivUrl[1];
  } else if (lower.startsWith("arxiv:")) {
    arxivCandidate = value.slice(6);
  } else if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(value)) {
    arxivCandidate = value;
  }
  if (arxivCandidate) {
    return {
      kind: "arxiv",
      value: `ARXIV:${arxivCandidate.replace(/\.pdf$/i, "")}`,
    };
  }

  if (lower.startsWith("corpusid:")) {
    return { kind: "s2", value: `CorpusId:${value.slice(9)}` };
  }
  if (/^[0-9a-f]{40}$/i.test(value)) {
    return { kind: "s2", value };
  }
  return { kind: "query", value };
}
