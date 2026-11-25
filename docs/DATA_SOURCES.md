# Data sources, retrieval, and provenance

Paper Orbit has three explicit data modes. They share the same normalized paper,
relationship, graph, and scoring contracts but are never substituted for one
another silently.

## 1. Live mode — OpenAlex (public) and Semantic Scholar (optional)

The public Vercel deployment and the static GitHub Pages mirror use
[key-free OpenAlex](https://openalex.org/) for Live mode. Semantic Scholar
remains available as an optional keyed server provider and is the source of the
stored snapshots in section 2. The two providers are never mixed within one
loaded neighborhood; the provider name is stored on every paper and on the
neighborhood.

### OpenAlex (public deployment)

**Provider:** [OpenAlex](https://openalex.org/), OurResearch. OpenAlex data is
available under CC0.

**Official references:**

- [OpenAlex API documentation](https://docs.openalex.org/)
- [OpenAlex about and attribution](https://openalex.org/about)

**Endpoints used:**

```text
GET https://api.openalex.org/works
    ?search=<query>&per-page=10&page=<n>&select=<metadata fields>

GET https://api.openalex.org/works
    ?filter=openalex_id:<W...>|openalex_id:<W...>&per-page=<n>&select=<metadata fields>

GET https://api.openalex.org/works
    ?filter=cites:<W...>&per-page=40&select=<metadata fields>

GET https://api.openalex.org/works
    ?filter=doi:<doi>&per-page=1&select=<metadata fields>
```

OpenAlex work IDs are normalized to `W…` strings. DOI and arXiv input is mapped
to a DOI lookup (`10.48550/arxiv.…` for arXiv) and then to the canonical OpenAlex
work ID. The center record supplies the reference list and the related-works
list; those IDs are fetched in bounded batches. Citation edges follow the same
rules as the rest of the app: references point from the center to the cited
work, citing papers point to the center, and related works are association-only,
not citation edges. OpenAlex "related works" are algorithmic associations, so
the UI labels them as related works rather than quality-ranked recommendations.

The center request includes `abstract_inverted_index`, which is reconstructed
into plain text. Neighbor batches request title/metadata fields only, so local
text similarity is title-only for those records. OpenAlex requires no API key;
the public deployment does not ask for one. Public rate limits and transient
upstream failures are handled with bounded retries and branch-level provenance.

**Verified public sample:** November 24, 2026, against
`https://paper-orbit-live.vercel.app`: search returned 10 results with
*Attention Is All You Need* first; DOI and arXiv resolution both returned
`W2626778328`; the neighborhood contained 91 nodes and 80 edges (40 references,
40 citing papers, 10 related works), all branches `ok`.

### Semantic Scholar (optional keyed provider)

**Provider:** [Semantic Scholar](https://www.semanticscholar.org/?utm_source=api),
Allen Institute for AI.

**Official references:**

- [Academic Graph API](https://api.semanticscholar.org/api-docs/graphs)
- [Recommendations API](https://api.semanticscholar.org/api-docs/recommendations)
- [API license](https://api.semanticscholar.org/license/)
- [API overview](https://webflow.semanticscholar.org/product/api)

### Endpoints used

```text
GET https://api.semanticscholar.org/graph/v1/paper/search
    ?query=<query>&limit=10&offset=<n>&fields=<search fields>

GET https://api.semanticscholar.org/graph/v1/paper/<paperId|DOI:...|ARXIV:...>
    ?fields=<paper fields>

GET https://api.semanticscholar.org/graph/v1/paper/<paperId>/references
    ?limit=40&offset=0&fields=<paper fields>

GET https://api.semanticscholar.org/graph/v1/paper/<paperId>/citations
    ?limit=40&offset=0&fields=<paper fields>

GET https://api.semanticscholar.org/recommendations/v1/papers/forpaper/<paperId>
    ?from=all-cs&limit=20&fields=<paper fields>
```

Requested fields:

```text
paperId,title,year,authors,venue,citationCount,referenceCount,url,externalIds,abstract
```

Search omits `abstract` to keep result payloads smaller. The center and
neighborhood branches request abstracts when the provider returns them.

### Supported identifiers

`lib/identifiers.ts` recognizes:

- raw DOI strings such as `10.1162/neco.1989.1.2.270`
- `DOI:...` identifiers
- `https://doi.org/...` links
- bare arXiv IDs, `arXiv:...`, and arXiv abstract/PDF URLs

Anything else is a search query. The resolver does not fetch arbitrary user
URLs. DOI slashes and URL-like input are URL-encoded as one path segment.

### Normalization and graph semantics

- Raw provider JSON is validated with Zod and stays inside the adapter.
- One canonical node per paper ID; memberships are merged.
- Reference branch: center → cited paper is a citation edge.
- Citing branch: citing paper → center is a citation edge.
- Recommendation branch: center — candidate is a separate undirected
  association, never a citation edge.
- Peripheral-to-peripheral citation edges are not inferred.
- Self-edges and duplicate center-as-neighbor records are removed.
- Missing years, citation counts, abstracts, and venues stay `null`; they are not
  turned into zero or invented text.
- A known zero citation count is preserved and rendered differently from
  unknown.
- Requested versus received versus distinct counts, skipped entries, next
  offsets, and branch failures are retained in `coverage`.
- An empty successful branch is `empty`; a failed branch is `error` or
  `unavailable`; the two are never conflated.

### Rate limiting, cache, and errors

- A per-process scheduler starts at most one upstream request at a time and
  waits at least `UPSTREAM_MIN_INTERVAL_MS` (default 1100 ms) between starts,
  larger than the documented 1 request/second credentialed limit.
- Identical in-flight requests are coalesced.
- Successful searches are cached for 10 minutes; metadata and neighborhoods for
  24 hours in a size-bounded LRU. Failed branches receive a short retry-friendly
  cache so one branch failure does not become a successful empty result.
- Upstream timeout defaults to 8 seconds; the route budget is approximately
  25 seconds. Eligible timeouts, 5xx, and 429 responses are retried at most
  twice. `Retry-After` is honored when it fits the budget.
- The API key is read server-side only. It never appears in browser code, URLs,
  exports, logs, or error envelopes.
- Error codes include `INVALID_INPUT`, `NOT_FOUND`, `RATE_LIMITED`,
  `PROVIDER_UNAVAILABLE`, `UPSTREAM_TIMEOUT`, `PROVIDER_CONFIGURATION`,
  `INVALID_PROVIDER_RESPONSE`, and `DEMO_CENTER_UNAVAILABLE`.

### Live verification — October 28, 2026

Performed against the local production server with a server-side API key. The
key and request headers are not stored. Full machine-readable results are in
[`../qa/live-verification.json`](../qa/live-verification.json).

| Check | Result | Observed latency |
|---|---|---:|
| Search “Attention Is All You Need” | 10 results; first is the expected paper | 2037 ms |
| arXiv ID `arXiv:1706.03762` | 200; resolved to `204e…e776` | 1642 ms |
| arXiv URL `https://arxiv.org/abs/1706.03762` | 200; resolved via cache | 2 ms |
| DOI `10.1162/neco.1989.1.2.270` | 200; resolved to `ce9a…48de` | 2150 ms |
| DOI URL `https://doi.org/10.1162/neco.1989.1.2.270` | 200; resolved via cache | 1 ms |
| Live neighborhood around Attention | 100 loaded nodes (99 neighbors), all three branches `ok` on a later attempt | 7062 ms |
| Browser inspection | 99 visible, live-provider label, no console errors, no warning banner | — |

Observed live branch counts for the complete Attention sample:

- references: 39 received / 39 distinct
- citing: 40 received / 40 distinct, next offset 40
- recommendations: 20 received / 20 distinct, `all-cs`

A preceding live attempt had a failed references branch (HTTP/provider
variability). The UI showed “Some branches are unavailable or incomplete” and the
provenance table showed `error`, not an empty citation list. A later attempt
completed all branches. This is expected provider behavior under the 1 req/s
limit, not a hidden retry that fabricates data.

Unauthenticated verification earlier in the build returned
`HTTP 429 Too Many Requests` with a message directing the caller to apply for a
key. Those raw headers/body observations are preserved in
[`../qa/s2-live-headers.txt`](../qa/s2-live-headers.txt) and
[`../qa/s2-live-body.txt`](../qa/s2-live-body.txt). No real data was invented to
work around that block.

## 2. Stored snapshot mode — real bounded samples

**Location:** `data/snapshots/`

**Acquisition:** opt-in `npm run demo:fetch -- --seed ...` using the same
server-side adapter and normalization pipeline. The script writes normalized
papers, observed citation directions, recommendation associations, coverage,
source URLs, retrieval times, limits, recommendation pool, and schema version.
It does not write raw response headers, API keys, or full text.

**Manifest:** `data/snapshots/manifest.json`
(`schemaVersion: 1`, `provider: semantic-scholar`,
`provenance.kind: semantic-scholar-snapshot`, generated
`2026-10-28T18:18:40.243Z`).

### Stored centers

| Center | Loaded nodes | Neighbors | References | Citing | Recommended | Notes |
|---|---:|---:|---:|---:|---:|---|
| Attention is All you Need (`204e…e776`) | 100 | 99 | 39 | 40 | 20 | complete branches |
| A Deep Reinforced Model for Abstractive Summarization (`032274…458e`) | 98 | 97 | 40 | 40 | 20 | overlaps merged; complete branches |
| A Learning Algorithm for Continually Running Fully Recurrent Neural Networks (`ce9a…48de`) | 60 | 59 | 0 | 40 | 19 | references branch preserved as `error` (“unexpected response shape”); not treated as zero references |

Linked centers:

- Attention → A Deep Reinforced Model is an observed reference.
- A Deep Reinforced Model → the LSTM paper is an observed reference.
- All three centers have stored neighborhoods, so offline recenter history can
  traverse the chain. A catalog-only paper still shows the honest unavailable
  recenter behavior.

Missingness in the stored samples is material:

- 83 of 99 Attention neighbors lack abstracts.
- 86 of 97 Deep Reinforced neighbors lack abstracts.
- 58 of 59 LSTM neighbors lack abstracts.
- Years and citation counts are present for the sampled neighbors except one
  unknown year in the LSTM neighborhood.

The app therefore shows “Title only” or “Unavailable” similarity coverage rather
than imputing abstracts or scores. Unknown abstracts and years are counted in the
provenance panel.

### Storage and redistribution decision

The snapshots are normalized Semantic Scholar data for a local course prototype.
The API license limits use to internal research/education and requires public
displays of data to point back to Semantic Scholar with a `utm_source=api` link
and include the Semantic Scholar name/logo. The app includes the name and link in
the footer, about page, and provenance dialog, but does not bundle an official
logo asset. Before public deployment or redistribution:

1. Re-read the current [API license](https://api.semanticscholar.org/license/).
2. Add the permitted official Semantic Scholar name/logo treatment.
3. Confirm whether the stored abstracts may be publicly redistributed; remove
   abstracts if required.
4. Keep the source URL, retrieval timestamp, sampling limits, and attribution
   with any copy.

The local `data/snapshots/` files should not be presented as a complete citation
index or as the authors' original publication data.

## 3. Synthetic interaction demo

**Location:** `data/demo/`

- 42 hand-authored fictional papers.
- 3 stored neighborhoods:
  - `syn-paper-001` — 21 nodes (20 neighbors; 12 citation edges, 9
    recommendations).
  - `syn-paper-002` — 16 nodes (15 neighbors; 10 edges, 6 recommendations).
  - `syn-paper-003` — 17 nodes (16 neighbors; 10 edges, 7 recommendations).
- Two neighborhoods are linked for recenter/history.
- `syn-paper-042` is catalog-only and appears in center 001 so unavailable
  recenter can be exercised.
- Provider is `synthetic-test`; mode is `synthetic-demo`.
- Titles, authors, venues, counts, relationships, and scores are fictional.
- A persistent badge and notice identify the mode in results, explorer,
  details, provenance, and exports.

Regenerate with:

```bash
npm run demo:synthetic
```

The synthetic demo is not a fallback hidden behind a live failure. It is an
explicit mode and is never mixed with real results.

## 4. What is not used

- No remote LLM, generated abstracts, or generated citation claims.
- No paid embeddings, SPECTER vectors, topic clustering, or vector database.
- No full-text PDF ingestion or paywall bypass.
- No geographic coordinates or map textures.
- No user accounts, database, or cloud persistence.
- No fabricated “importance,” “quality,” or provider similarity scores.

Local text similarity is TF-IDF cosine over the loaded neighborhood's available
titles and abstracts. It is reproducible, bounded to the sample, and explicitly
not a semantic or quality measure.
