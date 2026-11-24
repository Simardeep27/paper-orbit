# Paper Orbit — End-to-End Build Specification

**Audience:** a local coding model implementing this project autonomously.  
**Prepared:** October 28, 2026.  
**Deliverable:** a working, polished research-paper exploration application, its source, tests, reproducible demo, and course submission documentation.  
**Status:** implementation specification; no application has been built or tested by this document's author.

## 1. Instructions to the implementing model

Build the application described here, not merely a landing page or static mockup. Read this entire document before coding. Use it as the source of truth for product behavior. Inspect the target directory and any applicable AGENTS.md first. Preserve unrelated user files. Create the app inside a dedicated project directory if the current directory contains other projects.

Make routine implementation decisions yourself. Do not stop after scaffolding or planning. Work through implementation, tests, production build, browser verification, and documentation. If API credentials or network access are unavailable, finish the explicitly labeled demo and test flows, implement the live adapter, and clearly report which live checks remain unverified. Never invent successful tests, API responses, citations, papers, or user-study findings.

Prioritize in this order:

1. Correct data and relationship semantics.
2. Complete search → explore → inspect → recenter workflow.
3. The spherical visual experience and useful coordinated views.
4. Robust error handling, accessible alternatives, and reproducible demo.
5. Visual refinement and performance.

Implement the required scope before stretch features. Use current mutually compatible stable dependencies, record exact resolved versions in a lockfile, and consult official documentation when an API differs from examples here. Do not use a remote LLM, paid embedding API, authentication service, or database as an implicit dependency.

## 2. Product concept

**Name:** Paper Orbit.  
**Tagline:** Explore the research around a paper.  
**Core idea:** a selected paper sits at the center of an interactive three-dimensional neighborhood. Its references, papers that cite it, and provider-recommended papers surround it like a world of research. Users inspect individual papers, filter the neighborhood, compare candidates, and move the center to a new paper.

The experience should feel like exploring a research observatory: spatial, calm, legible, and purposeful. The sphere is the main visual identity. It must remain an analytical interface, with a linked list and timeline that make the same information easy to compare.

**Primary user:** a graduate student starting a literature review from one known paper.

**Secondary user:** a researcher investigating how work develops around a particular publication.

**Product promise:** help users find relevant reading and understand observed citation connections. Do not claim to map an entire field, prove scientific influence, measure research quality, or compute exhaustive semantic neighborhoods.

### Concrete questions the application must support

| User question | Required support |
|---|---|
| What earlier work does this paper reference? | Reference relationship filter, directed edges, details list |
| Which papers cite this paper? | Citing relationship filter, year distribution, paper details |
| Which nearby papers might I read next? | Recommendations and transparent local text similarity, shortlist |
| Which candidates match my year and citation criteria? | Coordinated filters and sortable list |
| How do two candidate papers differ? | Side-by-side metadata, abstracts, relationship explanations |
| What happens when I follow a paper into its neighborhood? | Explicit recenter action, history, recoverable navigation |

These are domain questions. Their visualization abstractions include lookup, filter, compare, rank, identify distributions, inspect adjacency, and follow directed graph connections.

## 3. Course context and constraints

This is intended for UMass Amherst COMPSCI 571, Data Visualization & Exploration, Fall 2026. The following facts were read from the logged-in Canvas syllabus, project brief, and announcements. They are course context, not product features.

| Item | Verified requirement |
|---|---|
| Course weight | Semester project contributes 45% of the course grade |
| Team | Three preferred; two to three permitted; individual projects require instructor approval |
| Technology | Any suitable language or technology; technology choice itself does not affect evaluation |
| Deliverable 1 | Nov 5, 2026, after the Oct 27 extension; 40/100 project points |
| Deliverable 1 format | PDF, maximum 2 pages of text plus 2 pages of figures |
| Deliverable 1 content | Dataset, users, tasks, and data/task abstraction |
| Deliverable 2 | Nov 24, 2026; 15/100 project points |
| Deliverable 2 format | PDF, maximum 2 pages of text plus 3 pages of figures; prototype and design rationale; working implementation not yet required |
| Final | Complete and presentation-ready by Dec 8, 2026; 45/100 project points |
| Final submission | Working interactive dashboard, source code, short README; hosted app or complete locally runnable package |
| Demonstration | Approximately 5 minutes: 1–2 minutes introduction and 3 minutes demonstration |
| Optional evaluation | Up to 5 bonus project points; completed before final demonstration |

Deliverable 1 scoring: dataset 5, users 10, tasks 10, abstraction 15. Final scoring: data explanation 2.25, problem motivation 9, proposed solution explanation 4.5, fit to data/problem 9, correct implementation 11.25, meaningful interaction 4.5, working tool 2.25, presentation 2.25.

The brief explicitly allows coordinated systems using established visualization techniques. A novel chart is not required. Confirm any separate course rules on AI assistance before submitting; no AI-use policy was established during the course inspection. Exact submission times were not established, so do not invent a time of day.

Sources:

- [Canvas course](https://umamherst.instructure.com/courses/41998)
- [Semester Project Details](https://docs.google.com/document/d/1ShgQnrL19hbXz7IlN-VxgkXYpHOHSHCx_A_ISWrAqnY/edit)
- [Submission announcement](https://umamherst.instructure.com/courses/41998/discussion_topics/604431)
- [Deliverable 1 extension](https://umamherst.instructure.com/courses/41998/discussion_topics/605803)

## 4. Scope

### Required release

- Search by title/keywords; resolve supported DOI and arXiv identifiers.
- Search results with title, authors, year, venue, and citation count when known.
- Load one bounded neighborhood around a selected central paper.
- Three relationship memberships: references, citing papers, recommendations.
- Spherical 3D view with orbit/zoom, selection, readable labels, reset camera, and legend.
- Fully usable SVG 2D radial view and HTML list sharing the same state.
- Linked publication-year histogram with an accessible range filter.
- Relationship, year, minimum citation count, text similarity, and local text filters.
- Paper details, two-paper comparison, recenter, and navigation history.
- Locally saved reading shortlist and export of a reading list.
- Transparent provenance, sample coverage, missing-data states, and similarity explanation.
- A deterministic demo that can run without API credentials or network access.
- Responsive layout, keyboard support, automated checks, and browser QA.

### Explicitly outside the required release

- Full-text PDF ingestion, paywall bypass, PDF storage, or crawling publisher sites.
- Global corpus indexing, arbitrary multi-hop graph expansion, or unlimited nodes.
- Accounts, cloud reading-list sync, collaboration, payments, or production-scale infrastructure.
- LLM-generated abstracts, summaries, claims, topic labels, or citation intent.
- Full semantic embeddings, automatic research-topic clustering, or a vector database.
- Claims that provider recommendations are exhaustive, scored semantic matches.
- Mobile 3D feature parity; mobile must offer complete list/2D task support.

## 5. Architecture and implementation stack

Use a single TypeScript application:

- **Next.js App Router + React:** UI and server-side API routes.
- **Three.js:** direct renderer for the 3D neighborhood, isolated behind a React component. Use OrbitControls and Raycaster. Avoid adding a second graph-rendering framework.
- **D3 modules:** scales, histogram/binning, and SVG utilities for timeline and 2D view. Let React own SVG elements; avoid competing DOM ownership.
- **Zustand:** shared exploration state. A small reducer/context is acceptable if it preserves the contracts below.
- **Zod:** request validation and provider-response normalization.
- **CSS variables + CSS modules or Tailwind:** choose one consistent styling approach.
- **Vitest + Testing Library:** pure transformations and component behavior.
- **Playwright:** critical end-to-end flows, including demo mode and fallback rendering.

Use npm and commit package-lock.json. Use the current stable Node LTS supported by the resolved Next.js version; record it in .nvmrc and package.json engines. Do not hard-code an unverified version from memory. No Python service is required.

```text
Browser
  Search / controls / list / details / comparison
                  │ shared canonical exploration state
          ┌───────┼─────────┐
          │       │         │
       3D view  2D view   timeline
                  │
          Same-origin /api routes
                  │
       validation → cache → rate-limited provider adapter
                  │
          Semantic Scholar official APIs

Demo mode → local versioned fixture provider → same normalized contracts
```

The graph route returns one bounded response; a normal HTTP request is enough. Do not add WebSockets, queues requiring external services, or streaming transport just for this project.

Keep the provider adapter, normalizer, graph assembly, scoring, selectors, and renderer separate. Do not put fetching, graph inference, and Three.js animation inside one component.

### Suggested directory structure

```text
paper-orbit/
  BUILD_SPEC.md
  app/
    layout.tsx
    page.tsx
    explore/page.tsx
    api/search/route.ts
    api/resolve/route.ts
    api/neighborhood/route.ts
    api/health/route.ts
  components/
    SearchBox.tsx
    SearchResults.tsx
    ExplorerShell.tsx
    OrbitScene.tsx
    RadialGraph.tsx
    YearHistogram.tsx
    FilterPanel.tsx
    PaperList.tsx
    PaperDetails.tsx
    ComparePanel.tsx
    ReadingList.tsx
    ProvenancePanel.tsx
  lib/
    types.ts
    schemas.ts
    providers/semantic-scholar.ts
    providers/demo.ts
    providers/index.ts
    server/cache.ts
    server/rate-limit.ts
    graph/normalize.ts
    graph/build.ts
    graph/similarity.ts
    graph/layout.ts
    graph/selectors.ts
    graph/export.ts
    state/explorer.ts
    state/persistence.ts
  data/demo/
    manifest.json
    neighborhoods/
  scripts/fetch-demo.ts
  tests/unit/
  tests/e2e/
  docs/
    DATA_SOURCES.md
    DESIGN_RATIONALE.md
    DELIVERABLE_1_DRAFT.md
    DELIVERABLE_2_DRAFT.md
    EVALUATION_PLAN.md
    DEMO_SCRIPT.md
    QA_REPORT.md
  .env.example
  .gitignore
  README.md
  package.json
  package-lock.json
```

Filenames may change modestly; preserve these boundaries and deliverables.

## 6. Data source and verified integration surface

Use Semantic Scholar as the primary provider. Official documentation checked while preparing this specification supports the following endpoint shapes. Revalidate requested fields against current response schemas during implementation. This document verifies documentation, not successful live API calls.

```text
Graph base: https://api.semanticscholar.org/graph/v1
GET /paper/search?query=...&limit=10&offset=0&fields=...
GET /paper/{paper_id}?fields=...
GET /paper/{paper_id}/references?limit=40&offset=0&fields=...
GET /paper/{paper_id}/citations?limit=40&offset=0&fields=...

Recommendations base: https://api.semanticscholar.org/recommendations/v1
GET /papers/forpaper/{paper_id}?from=all-cs&limit=20&fields=...
```

References responses wrap neighboring papers in `citedPaper`; citations wrap them in `citingPaper`. Supported lookup identifiers include Semantic Scholar IDs, `DOI:...`, and `ARXIV:...`. Normalize returned IDs before graph assembly. [Official Academic Graph documentation](https://api.semanticscholar.org/api-docs/graphs)

The single-paper recommendation endpoint documents `recent` and `all-cs` candidate pools. Default this educational prototype to computer-science seed papers and `all-cs`; show the pool in provenance. Recommendations are candidates, and returned availability can vary. Do not assume the endpoint returns a numerical similarity score. [Official Recommendations documentation](https://api.semanticscholar.org/api-docs/recommendations)

### Field selection

Suggested minimal graph metadata fields:

```text
paperId,title,year,authors,venue,citationCount,referenceCount,url,externalIds,abstract
```

Request only endpoint-supported subsets. Search may omit abstracts to keep responses small; fetch the central paper and neighborhood with abstracts if supported. A missing optional field must not break the workflow. Store unknown values as null, not zero or empty fabricated text. Avoid embedding requests in the required release.

Construct query strings with URLSearchParams. Encode a full external identifier as one path segment; test DOI slashes and URL-like input. The resolve route recognizes DOI strings, `https://doi.org/...`, arXiv IDs and arXiv abstract URLs; otherwise treat input as a search query. Do not fetch arbitrary user-provided URLs.

### Rate limiting and reliability

Semantic Scholar documents an introductory API-key limit of 1 request per second; unauthenticated access is shared and can be throttled. Treat the assigned key's actual limit as authoritative. Keep credentials server-side. [Official API overview](https://webflow.semanticscholar.org/product/api)

Implementation defaults, which are our design choices:

- Global per-process upstream scheduler: concurrency 1, at least 1,100 ms between request starts. Sharing applies across search and graph requests.
- Request coalescing for identical in-flight operations; avoid duplicate work from double clicks.
- No search-as-you-type API calls. Submit on Enter or button; validate at least 2 characters for keywords.
- Upstream timeout 8 seconds; total neighborhood route budget about 25 seconds.
- Retry eligible timeouts/5xx/429 at most twice within the route budget. Honor Retry-After; if it exceeds the remaining budget, return a typed rate-limit response instead of sleeping indefinitely.
- Never retry 400/401/403/404 automatically. Surface actionable messages.
- Cache successful search results for 10 minutes and metadata/neighborhoods for 24 hours, using a size-bounded LRU. Key includes provider, endpoint, normalized params, requested fields, schema version, and recommendation pool.
- Do not cache an error as a successful empty array. Preserve branch failures and fetched times. Partial responses may have a short 30-second cache to prevent storms.
- Single-process local deployment is the reference target. Multiple server instances need a shared limiter/cache before public scale; do not claim the in-memory scheduler coordinates instances.

### Acquisition budget and coverage

The initial neighborhood fetches the center, up to 40 references, up to 40 citing papers, and up to 20 recommendations. At most 101 distinct nodes including center. Fetch branches independently through the scheduler so one failure does not discard successful branches. Do not issue one metadata request per node if a branch already returns the needed fields.

No automatic pagination or hidden multi-hop fetching in the required release. Track returned continuation offsets and whether more results are available. Label each relation as a bounded provider sample, not “top papers” or “complete graph.” Local sorting ranks only fetched candidates. Citation/reference metadata totals and retrieved counts must remain separate.

Example user-facing status: “74 papers loaded. References and citing papers are sampled; recommendations use the all-cs pool.” Use actual counts. In a more detailed panel show raw entries received, valid distinct neighbors, skipped records, paging availability, branch failures, and timestamps.

## 7. Canonical data contracts

Use equivalent strongly typed structures. Provider JSON stays inside its adapter.

```ts
type Membership = 'reference' | 'citing' | 'recommended';
type BranchStatus = 'ok' | 'empty' | 'error' | 'unavailable';

interface Paper {
  id: string; // canonical provider paperId
  title: string;
  authors: { id: string | null; name: string }[];
  year: number | null;
  venue: string | null;
  abstract: string | null;
  citationCount: number | null; // provider-wide metadata, not visible degree
  referenceCount: number | null;
  url: string | null;
  externalIds: { DOI?: string; ArXiv?: string };
  source: 'semantic-scholar' | 'synthetic-test';
  fetchedAt: string; // ISO timestamp
}

interface OrbitNode {
  paper: Paper;
  memberships: Membership[]; // can contain more than one
  recommendationRank: number | null;
  textSimilarity: number | null; // derived local score; not a provider score
  similarityCoverage: 'title+abstract' | 'title-only' | 'unavailable';
}

interface CitationEdge {
  id: string;
  source: string; // citing paper
  target: string; // cited paper
  kind: 'citation';
  evidence: 'references-endpoint' | 'citations-endpoint';
}

interface RecommendationLink {
  id: string;
  source: string; // center
  target: string; // recommended candidate
  kind: 'recommendation'; // undirected visual association, not a citation
  pool: 'recent' | 'all-cs';
  rank: number;
}

interface BranchCoverage {
  status: BranchStatus;
  requestedLimit: number;
  receivedEntries: number;
  validDistinctPapers: number;
  skippedEntries: number;
  nextOffset: number | null;
  message?: string;
}

interface Neighborhood {
  schemaVersion: 1;
  centerId: string;
  nodes: OrbitNode[];
  edges: CitationEdge[];
  recommendations: RecommendationLink[];
  mode: 'live' | 'snapshot' | 'synthetic-demo';
  provider: 'semantic-scholar' | 'synthetic-test';
  fetchedAt: string;
  recommendationPool: 'recent' | 'all-cs';
  coverage: {
    references: BranchCoverage;
    citing: BranchCoverage;
    recommended: BranchCoverage;
  };
  warnings: string[];
}
```

### Normalization invariants

- One node per canonical paper ID. Merge memberships; never render duplicates for overlapping relations.
- Reject records without a usable ID. Count skipped records explicitly. A known ID with missing title displays “Title unavailable.”
- Deduplicate citation edges by `(source,target)`. Do not infer a citation from similar titles, common authors, shared keywords, recommendation membership, or publication years.
- Center references A → citation edge `center → A`.
- B cites center → citation edge `B → center`.
- Recommendation C → separate association `center — C`, with dashed styling and no citation arrow.
- Remove self-edges and center-as-neighbor duplicates. Keep the center node exactly once.
- Do not infer citation edges between peripheral nodes. This is an ego-neighborhood, not a complete induced citation graph.
- Conflicting non-null fields use central metadata first, then a documented deterministic branch priority. Do not silently sum citation counts across duplicate records.
- Normalize invalid/negative citation counts and non-finite values to null. Preserve a legitimate zero. Keep unknown dates unknown.
- A mutual citation pair may exist; preserve observed directions even when dates look surprising.

## 8. Define “nearby” honestly

There are three separate concepts:

1. **Citation relationship:** an observed directed connection from provider metadata.
2. **Recommended:** provider-selected candidate; rank is an ordering, not a similarity magnitude.
3. **Local text similarity:** our reproducible TF-IDF cosine score over the loaded neighborhood.

Do not label TF-IDF as deep semantic similarity or research quality. Use the label **Text similarity**. The help text must explain: “Based on overlapping words in available titles and abstracts within this loaded neighborhood. It can miss conceptual similarity.”

### Required local scoring algorithm

1. Build a corpus from the center and all distinct loaded neighbors, before UI filters.
2. Text is title plus available abstract; repeat the title twice to give it modest additional weight. Missing abstract gives a title-only document. Display pair coverage as title-only when either center or candidate lacks an abstract.
3. Normalize Unicode consistently, lowercase, tokenize letters/numbers, discard tokens shorter than 2 characters, and remove a committed English stopword list. Do not strip all short technical terms; document this limitation.
4. Raw term count `tf(t,d)`; `idf(t) = ln((1 + N) / (1 + df(t))) + 1`.
5. Weight `w(t,d) = tf(t,d) * idf(t)`. L2-normalize each nonzero vector.
6. Cosine is the dot product, clamped to [0,1] for numerical stability. Zero overlap yields 0. Empty/zero vectors yield null, never an invented 0.5.
7. Compute center-to-neighbor values; exclude center from rankings and histogram.
8. Save the algorithm/version and corpus IDs with any exported session metadata. Freeze values for that loaded neighborhood; filters do not recompute scores or move nodes.

Scores are neighborhood-dependent and not directly comparable across different centers or fetched corpora. Display at most two decimals as a score, not “82% relevant.” Do not use the recommendation rank as a fallback numerical text score.

## 9. Spherical visualization specification

### Spatial design

Place the center at `[0,0,0]`, visually larger with a restrained halo. Surround it with a bounded spherical volume of papers. Use a faint wireframe outer shell and subtle orbit guides, not an opaque globe that hides nodes. No geographic map texture: papers have no latitude/longitude meaning.

**Default layout: spherical distribution with similarity radius.**

```text
score s in [0,1]
r(s) = 3 + 7 * (1 - s)
unknown similarity → r = 11.5, visibly designated unknown shell
position = r * deterministicUnitDirection(paperId)
```

The unit direction comes from a stable seeded hash of the canonical ID. Use two independent well-distributed hash-derived values `u,v ∈ (0,1)`, `z = 1 - 2u`, `phi = 2πv`, and direction `(sqrt(1-z²)cos(phi), z, sqrt(1-z²)sin(phi))`. Avoid Math.random in rendering.

Radius encodes similarity to the center only. **Angular proximity and peripheral-to-peripheral distances do not encode similarity or topic clusters.** Say this in the legend/help. The view is a spherical neighborhood, not a semantic manifold. Camera perspective and node sizes also affect apparent screen distances; the details score and list are the precise comparison tools.

Offer a secondary **Even shell** layout placing all neighbors at radius 8. Its legend must say position is for arrangement only. This makes relation exploration usable when many abstracts are missing. Keep scoring and filtering unchanged.

Do not displace node radii to solve overlaps; that would distort the encoding. Manage overlap with camera movement, picking, selective labels, and the list. Maintain a minimum clickable screen-space target through a picking layer without enlarging the data-encoded node itself.

### Marks and channels

| Element/channel | Meaning |
|---|---|
| Center halo + distinct shape/ring | Central paper |
| Cyan node | Reference membership |
| Amber node | Citing membership |
| Violet node | Recommendation membership |
| White outlined node with membership badges | Multiple memberships |
| Node size | Log-scaled provider citation count |
| Solid directed line | Verified citation |
| Dashed line, no arrow | Recommendation association |
| Similarity radius | Local text similarity to center, when enabled |
| Bright outline | Selected or compared paper |
| Year histogram position | Publication year |

Use explicit membership badges and accessible text in addition to color. Unknown citation counts use a small hollow glyph, distinct from known zero. Use a log1p scale for known counts with a restrained radius range (e.g. 0.10–0.28 world units). Freeze the size scale for the loaded neighborhood. Explain that citation count reflects indexed citations and is not a quality rating.

No decorative node motion once the layout settles. Auto-rotation is off by default; optional user-controlled slow rotation pauses during interaction and is disabled for reduced motion. No flashing, heavy bloom, giant particle fields, or unreadable full-title clouds.

### Interaction behavior

- Drag background to orbit; wheel/pinch to zoom with sensible min/max camera distances.
- Click a node to select and open/update its details; do not recenter on a single click.
- Separate “Make central paper” action recenters after selection.
- Distinguish dragging from clicking using a movement threshold.
- Hover shows a compact tooltip with title, year, relationships, citation count, and text score. Keep it within viewport bounds.
- Always label center and selected node; label a limited number of other visible nodes when space permits. Full information remains available in the list.
- Default edge visibility is center relationships, rendered faintly; selection emphasizes incident edges. Toggle citations/recommendations independently.
- Citation arrows point from citing paper to cited paper. Selected-edge explanation uses words, e.g. “A cites B.”
- Clicking a list row highlights its node; “Locate” rotates the selected node into the foreground without changing its data position. Avoid changing the camera on every keyboard highlight.
- Reset camera is always visible.
- Under reduced motion, use immediate camera/layout changes. Otherwise animate recenter for roughly 400–600 ms without blocking controls.

### Renderer engineering

Mount the Three.js renderer only on the client. Use ResizeObserver, correct camera aspect, capped device pixel ratio (max 2), and efficient sphere/line primitives. Dispose geometries, materials, controls, observers, animation loops, and event listeners on unmount. Raycast only selectable objects; keep decorative shells out of picking. Use requestAnimationFrame only while controls/animation require updates, or use a lightweight capped loop if simpler and measured. Pause rendering while the tab is hidden.

Labels should use a bounded HTML overlay or equivalent readable text strategy. Account for occlusion; do not attach labels to the backside as if visible. Gracefully handle WebGL context loss and rendering initialization failure with a message and automatic 2D switch. The rest of the app must remain functional.

## 10. Coordinated 2D view, list, timeline, filters

### 2D radial view

Implement a real SVG renderer using the same normalized nodes, edges, selection, and filters. Use deterministic angular placement around the center, with the same radius semantics as the selected layout. Keep angular positions stable when filtering. It is an alternate projection for usability, not a claim to preserve all 3D pairwise distances. Support pan/zoom or fit-to-view, selection, tooltips, recenter action, and visible legend. Do not render a screenshot of the 3D scene as the fallback.

### Paper list

The list is a first-class view, not an afterthought. Each row includes title, year/unknown, first authors, venue if known, relationship badges, citation count/unknown, text similarity/coverage, and shortlist/compare actions. Sorting options: text similarity, citation count, newest, oldest, recommendation rank (recommended subset). Nulls sort last in either direction; use title then ID as deterministic ties. State “Sorting loaded papers” so users do not confuse local sort with global corpus ranking.

### Year histogram

Show discrete publication-year counts of neighbors; exclude center. Unknown year gets a separate labeled count. Brushing selects an inclusive year interval and coordinates graph/list. Also provide labeled numeric start/end inputs so brushing is not required.

The histogram's context population applies relationship, citation, text, and similarity filters but excludes its own year filter. Show active interval/highlighting over context counts; provide counts for the current visible subset. This avoids a histogram collapsing into only the selected interval. State that these counts describe fetched papers, not all field publications.

### Filter semantics

- Relationship checkboxes are OR across memberships. Initially all three enabled. None selected produces zero neighbors and a clear reset action.
- All other active filters combine by AND.
- Year bounds are inclusive; “Include unknown years” is on by default and explicitly controls unknowns.
- Minimum citations defaults to 0, with “Include unknown citation counts” on by default. A user setting a positive threshold should be able to exclude unknowns deliberately.
- Minimum similarity defaults to 0, with “Include unavailable similarity” on by default. Nulls are controlled by this option, not coerced to zero.
- Local text filter matches title/authors/venue among loaded nodes. It does not issue an upstream search.
- Center always remains visible and is excluded from visible-neighbor counts. Edges survive only when both endpoints are visible.
- Visible count, list, graph, and histogram selection must agree. Keep hover separate from persistent selection.
- If filters hide the selected neighbor, clear its selection and announce the change; pinned comparison items and shortlist remain preserved with a “not in current view” indicator.
- “Reset filters” does not reset camera/history/shortlist; “Reset camera” does not alter filters.

## 11. Screens, layout, and visual system

### Landing/search

- Product name and one clear sentence describing the tool.
- Prominent search input with placeholder “Search papers, paste a DOI, or enter an arXiv ID”.
- Search submit button and separate “Try demo” action.
- Up to three verified seed examples once real snapshots exist; never fake metadata for them.
- Results show enough metadata to distinguish similarly titled papers.
- Loading, no-results, provider-unavailable, and invalid-input states.

### Explorer desktop layout

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Paper Orbit  [Search papers…]  [Explore] [Reading list (n)] [Data info]    │
├───────────────┬─────────────────────────────────────────┬────────────────┤
│ Filters       │ Center title + sampled-neighborhood info│ Paper details  │
│ Relationships │                                         │ title/authors  │
│ Year          │          spherical paper world          │ year / venue   │
│ Citations     │                                         │ abstract       │
│ Text score    │                                         │ why connected  │
│ Loaded search │                                         │ recenter/save  │
│ Reset filters │ [3D / 2D] [Layout] [Reset camera] [Help]  │ compare/open   │
├───────────────┴─────────────────────────────────────────┴────────────────┤
│ Linked publication-year histogram + accessible year inputs             │
├────────────────────────────────────────────────────────────────────────┤
│ Sortable papers / comparison / reading-list tabs                         │
└────────────────────────────────────────────────────────────────────────┘
```

At approximately 1440px wide, use a 230px filter rail, flexible visualization, and 320px details panel. Allow users to collapse panels. At laptop widths the details panel can be a drawer. At small screens, default to list/2D, filters in an accessible drawer, details in a full-height sheet, and no horizontal page overflow. Keep selected-paper context visible.

### Styling defaults

- Background `#0B1020`, panels `#121A2B`, raised panels `#19243A`.
- Main text `#F3F5FA`, muted text `#B0BCD0`, subtle borders `#30405B`.
- Reference cyan `#5DD6F4`, citing amber `#F6BE5A`, recommended violet `#B69CFF`.
- Check actual contrast, especially muted labels, controls, and focus states.
- Use a system sans-serif stack; no network font dependency. Titles can use a slightly tighter weight/spacing, not an illegible display font.
- Consistent 4/8px spacing increments; 10–14px panel corners; subtle shadows.
- Chart labels at least 12px, body text approximately 14–16px.
- A restrained star/grid backdrop is optional and must never resemble additional paper nodes.
- No giant marketing hero after entering exploration; prioritize analytical space.

### Required details panel

Title, complete authors (expand long lists), year, venue, provider citation count, provider reference count, abstract or “Abstract unavailable,” all applicable relationship badges, text similarity and its coverage, source link, DOI/arXiv link if known, “Make central paper,” “Add to reading list,” and “Compare.” Show data retrieval time in data info rather than cluttering every row.

External links use safe http/https URLs, clear labels, and appropriate rel attributes. Do not fetch arbitrary links on the backend. Do not automatically download or open a paper when selected.

## 12. Navigation and application state

Use one canonical store with roughly these concerns:

```ts
interface ExplorerState {
  neighborhood: Neighborhood | null;
  centerId: string | null;
  selectedPaperId: string | null;
  hoveredPaperId: string | null;
  compareIds: string[]; // max two, with metadata preserved across centers
  filters: Filters;
  view: '3d' | '2d' | 'list';
  layout: 'similarity-radius' | 'even-shell';
  history: HistoryEntry[];
  historyIndex: number;
  requestGeneration: number;
  status: 'idle' | 'loading' | 'ready' | 'partial' | 'error';
}
```

Derive visible IDs from selectors; do not store independent filtered arrays in each component. Compute layout/scoring from full loaded data, not the filtered subset. Persist shortlist separately with a schema version. Keep all state JSON-serializable; Three.js objects belong in renderer refs, not the app store.

### Recenter transaction

1. Keep the existing scene visible with a loading indicator and selected candidate identified.
2. Abort or invalidate the previous in-flight center request. Increment a generation token.
3. Fetch/cache the new neighborhood.
4. Only the latest generation may commit. Ignore late older responses even if AbortController did not stop upstream work.
5. On success, commit atomically; select the new center; reset center-specific filters to defaults; preserve view/layout/shortlist/comparison. Save old filters/camera with its history entry.
6. On error, keep old graph and history; show error with retry. Never relabel the old graph as belonging to the new center.
7. Back/forward restores the corresponding neighborhood and state from a bounded session cache; refetch only if necessary.

Store compact URL state for center ID, mode, view, layout, and supported filters using URLSearchParams. Do not put abstracts, graph JSON, API keys, or notes in the URL. Browser back/forward and app history must not double-push entries; synchronize through one navigation function. Unknown URL state should be validated and fall back safely.

## 13. Server routes and errors

### Contracts

```text
GET /api/search?q=<query>&offset=0&mode=live|demo
  → { papers: Paper[], nextOffset: number|null, sourceMode, fetchedAt }

GET /api/resolve?id=<identifier>&mode=live|demo
  → { paper: Paper, sourceMode }

GET /api/neighborhood?paperId=<id>&mode=live|demo
  → Neighborhood

GET /api/health
  → { ok: true, liveConfigured: boolean, demoAvailable: boolean }
```

Validate queries, length (e.g. keywords ≤300 chars, IDs ≤512), allowed mode/pool values, and bounded nonnegative offsets. Never let clients provide arbitrary upstream hosts or URLs. Set cache policy intentionally rather than relying on framework defaults. Use the Node runtime for these handlers.

Error envelope:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Paper search is busy. Please try again shortly.",
    "retryAfterSeconds": 10,
    "retryable": true
  }
}
```

Codes include INVALID_INPUT, NOT_FOUND, RATE_LIMITED, PROVIDER_UNAVAILABLE, UPSTREAM_TIMEOUT, PROVIDER_CONFIGURATION, INVALID_PROVIDER_RESPONSE, DEMO_CENTER_UNAVAILABLE. Map to meaningful HTTP statuses. Do not expose keys, stack traces, or raw provider error bodies.

Neighborhood branch errors return a partial graph only when center metadata succeeded. An empty successful branch is not an error; a failed branch is not “no citations.” If center lookup fails, return a route error and preserve the old UI. Search failures must not masquerade as no matches.

## 14. Demo, fixtures, and data provenance

Live APIs can be unavailable during a presentation. Provide explicit **Demo snapshot** mode backed by local data and using the same graph/list/filter components. Do not silently substitute fixtures when live search fails. Offer a visible “Try demo” action instead.

### Real demo acquisition

Implement `npm run demo:fetch -- --seed <identifier>` to retrieve bounded neighborhoods through the same adapter, normalize them, and write a versioned manifest with source URLs, retrieved dates, limits, pool, completeness, and schema version. Use a few computer-science seed papers verified through the API. Possible search terms include “Attention Is All You Need” or visualization survey papers; these are discovery inputs, not permission to fabricate IDs or metadata.

Aim for three real snapshots. Include at least two linked centers that both have stored neighborhoods, so offline recenter and history can be demonstrated. Demo search searches the local fixture catalog and clearly says so. An unstored center can be inspected and shortlisted, but recenter must explain “This paper's neighborhood is not included in the offline demo.” Do not build a fake recentered graph by reversing or reusing incomplete edges.

Record whether storage and redistribution of the chosen snapshot fields is allowed under applicable terms. Preserve required attribution/notices. Avoid bundling full text. Inspect the actual API terms before publishing fixtures or the public app; do not assume all response fields are public-domain data. The API license includes specific public-display attribution requirements, including a Semantic Scholar link with `utm_source=api` and name/logo requirements. Use official assets as permitted and document the source. [Official API license](https://api.semanticscholar.org/license/)

### If real acquisition is blocked

Create a small **Synthetic interaction demo** fixture with visibly fictional paper titles and `synthetic-test` provenance. Display that label persistently. It enables implementation and tests but must not be presented as real research data. Keep synthetic tests separate from any real snapshots. Document blocked live verification and snapshot acquisition as outstanding work; never mark real-data acceptance passed.

### Provenance panel

For every neighborhood show provider, mode, retrieval timestamp, recommendation pool, requested limits, branch statuses, unknown abstracts/years/counts, skipped entries, and fetched-versus-total counts where metadata totals exist. Explain sampling, citation indexing coverage, older-paper citation advantages, and the local nature of similarity. Keep concise summaries on screen and deeper technical detail in the data-info panel.

## 15. Comparison, reading list, and exports

**Compare:** select at most two papers; show title, authors, year, venue, citation count, memberships relative to the current center when applicable, abstract, and available text score with its center context. If a saved comparison paper is from another neighborhood, do not reuse its old similarity as a current-center score. Show “Not scored against current center.” No generated quality judgment or automatic winner.

**Reading list:** localStorage, versioned schema, deduplicated by canonical ID. Save essential metadata, user note (optional, plain text), and saved timestamp. Preserve list on reload. Handle disabled/full storage gracefully with in-memory operation and a message. A clear-reading-list action should ask for an in-app confirmation because users may have notes.

**Exports required:** Markdown reading list and JSON reading list with provenance, plus a PNG of the active visualization if feasible in the chosen renderer. If PNG export requires implementation-specific renderer configuration, test it early; otherwise use SVG export for the 2D view and document the supported format. Exporting a reading list must include only saved papers, not the entire dataset. Escape Markdown and sanitize filenames. No API keys, raw request headers, or unrelated localStorage in exports.

Graph-session JSON is optional and must be labeled as a sampled snapshot with algorithm version and retrieval timestamp. Do not expose a raw provider-data download before checking redistribution terms. No BibTeX required; do not invent publication metadata to produce it.

## 16. Accessibility and performance

### Accessibility acceptance

- Complete search, selection, filtering, comparison, shortlist, recenter, and back navigation work through keyboard-accessible HTML controls.
- 3D canvas has a descriptive label and nearby instructions; HTML list provides equivalent paper information and actions.
- Focus is visible, logically ordered, and restored after drawers/dialogs close.
- Dialogs/sheets have labels, Escape handling, focus containment where appropriate, and no keyboard trap.
- Changes to loaded/visible counts and errors use restrained polite live announcements; do not announce every hover.
- Memberships, missing values, and selection are not conveyed by color alone.
- Reduced motion disables automatic animation; a 2D/list alternative is always available.
- Numeric year inputs duplicate brush functionality. All icon-only controls have accessible names.
- Check contrast with tooling and inspect at 200% zoom.

### Performance targets, to measure rather than claim

- Up to 101 initial nodes, with a hard renderer guard at 150 for malformed/imported fixtures.
- Demo initial interaction available within about 2 seconds on a typical development laptop after assets load.
- Target at least 45 FPS while orbiting the required dataset on the measured laptop; record hardware/browser and actual results.
- Local filter updates feel immediate (target <100 ms for this node count).
- No live API request during camera movement, hover, selection of loaded details, or filters.
- No graph relayout during ordinary filtering.
- No unbounded cache, event-listener growth, or animation loops after repeated navigation.

If performance falls short, reduce labels/edge detail and pixel ratio before sacrificing functionality. Do not silently drop data nodes to hit a frame rate target.

## 17. Configuration and local operation

Create `.env.example` with documented values:

```dotenv
# Server-only; leave blank for unauthenticated live attempts or demo-only use.
SEMANTIC_SCHOLAR_API_KEY=
UPSTREAM_MIN_INTERVAL_MS=1100
UPSTREAM_TIMEOUT_MS=8000
ENABLE_LIVE_API=true
```

Do not prefix the API key with NEXT_PUBLIC_. Client-accessible environment prefixes can expose values in browser bundles; keep provider credentials solely in server modules. [Official Next.js environment-variable guidance](https://nextjs.org/docs/pages/guides/environment-variables)

Required scripts:

```text
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run demo:fetch -- --seed <identifier>
```

Configure an explicit lint script compatible with the selected framework version; do not assume a removed framework CLI command exists. Tests and the production build must not require provider credentials or live network calls. Lock dependencies and document installation, environment setup, demo usage, live usage, and known limitations.

Local server deployment is sufficient for this course. If hosting, use a Node-capable host with server-side secrets; static GitHub Pages alone cannot run live proxy routes. A static fixture-only variant may be a later option, not an accidental broken deployment. Never deploy automatically or incur paid services unless the user explicitly requests that action.

## 18. Implementation sequence and gates

### Phase A — scaffold and contracts

1. Inspect workspace and applicable instructions; scaffold isolated app.
2. Set up scripts, types, validation, formatting/linting, and test harness.
3. Build synthetic adversarial fixtures for tests: duplicate memberships, nulls, zero counts, absent abstracts, equal scores, partial branch failure, and no neighbors.
4. Implement normalization, edge direction, bounded graph assembly, TF-IDF, and selectors as pure functions.

**Gate:** tests prove semantics before visual polish.

### Phase B — complete 2D vertical slice

1. Search/demo entry, results, explorer shell, details.
2. SVG graph, list, timeline, filters, counts, legend.
3. Recenter transaction, history, URL state, stale-request protection.
4. Comparison, shortlist persistence, Markdown/JSON exports.

**Gate:** all core tasks work end-to-end on deterministic fixtures with keyboard support.

### Phase C — live provider and real snapshot data

1. Implement server-only adapter, field validation, request scheduler, timeout/retry, caching, and error envelope.
2. Verify actual response shapes for search, ID resolution, both citation directions, and recommendations.
3. Create permitted real snapshots and provenance manifest.
4. Exercise partial failure and rate-limit states.

**Gate:** document exactly which live checks succeeded. If credentials/network block verification, continue the build but retain that limitation in QA.

### Phase D — spherical scene

1. Client-only Three.js renderer with deterministic spherical layout.
2. Correct size/radius encodings, edges, labels, picking, camera controls.
3. Coordinate selection/filters with existing views; do not duplicate app state.
4. Reset, Locate, view switching, reduced motion, context-loss fallback, responsive controls.

**Gate:** 3D conveys the same papers, relationships, and counts as 2D/list.

### Phase E — polish and verify

1. Refine typography, spacing, details, loading states, legend/help, and responsive layout.
2. Run unit/component/E2E tests, lint, types, production build.
3. Start the production server and verify the built application in a browser.
4. Inspect desktop and mobile layouts; capture screenshots if browser tooling supports it.
5. Measure representative performance, fix material issues, and write QA report.
6. Write course drafts, reproducible README, and demo script.

**Gate:** every required acceptance criterion below is passed or explicitly reported as blocked/unverified with a concrete reason. Do not call an implementation complete when its primary flows are broken.

## 19. Meaningful tests

Use deterministic provider stubs for automated tests; optional live smoke checks are a separate opt-in command. Avoid brittle snapshots of the entire UI or tests that just repeat implementation details.

### Pure-function and adapter tests

- Reference and citation endpoint wrappers normalize into correct directed edges.
- A paper in all three branches becomes one node with all memberships.
- Recommendation links never become citation edges.
- Unknown citation count and known zero remain distinguishable.
- Invalid records are skipped with counts; no dangling edge endpoints.
- TF-IDF identical documents yield approximately 1; disjoint tokens yield 0; empty vectors yield null.
- Scoring/layout remain unchanged under filters; repeated layout inputs produce identical coordinates.
- Similarity radius is monotonic; unknowns use the unknown shell.
- Year filters are inclusive; unknown handling and multi-membership OR are correct.
- Histogram context excludes its own year filter and excludes the center.
- Partial branch failures differ from genuinely empty branches.
- Rate-limit retries respect Retry-After and total request budget using a fake clock.
- Duplicate in-flight requests are coalesced; failures do not poison successful cache entries.
- Malformed provider payload returns a typed error/partial branch, not a runtime crash.

### Component/E2E tests

1. Demo search → choose paper → scene/list/details show the same center.
2. Select a list paper → graph highlight and details agree.
3. Change relationship/year/citation filters → graph/list/counts agree.
4. Reset filters restores data; reset camera leaves filters unchanged.
5. Recenter on a stored demo neighbor → history back restores original center and filters.
6. Rapidly request centers A then B with reversed response timing → B remains displayed.
7. Recenter failure preserves old center and usable graph.
8. Compare two papers; enforce max two; remove/replace behavior is accessible.
9. Save paper, reload, verify persistence, export and parse JSON.
10. Live 429 and unavailable recommendations produce informative states, not false empty data.
11. Force WebGL failure → 2D fallback; search/filter/recenter still work.
12. Small viewport → no page overflow and core actions remain reachable.
13. Keyboard-only flow can search, select, save, filter, and recenter using HTML controls.

For automated 3D verification, test the derived scene model and synchronized DOM state; browser screenshots/manual inspection verify actual rendering and picking. Do not assert that merely creating a canvas proves the scene works.

## 20. Acceptance checklist

- [ ] Clean install and documented commands work with the recorded Node version.
- [ ] Demo mode runs without network or credentials and is visibly labeled by data provenance.
- [ ] Live search and DOI/arXiv resolution are implemented; successful live verification is separately recorded.
- [ ] At least one real neighborhood is inspected; aim for three snapshots and two offline-recenterable centers, subject to permitted storage.
- [ ] Center/reference/citing/recommended meanings are correct and visible.
- [ ] Spherical scene is interactive and stable; precise scores/metadata exist in the list.
- [ ] 2D/list fallback supports the same core analytical tasks.
- [ ] Filters, selection, counts, histogram, list, and graph remain synchronized.
- [ ] Similarity is transparently computed and labeled; no fabricated semantic scores or edges.
- [ ] Unknown values, samples, partial failures, and source times are represented honestly.
- [ ] Recenter/history work and stale responses cannot overwrite newer selections.
- [ ] Reading list persists; comparison and exports work.
- [ ] Tests, lint, types, and production build pass without live credentials.
- [ ] Browser QA covers desktop, mobile, keyboard, reduced motion, and WebGL fallback.
- [ ] Actual performance observations and limitations are recorded.
- [ ] README, design/data docs, course drafts, and demo script are delivered.
- [ ] No secret keys are committed, bundled, exported, or displayed.

## 21. Course documents to produce

These are Markdown drafts for human review, not fabricated final submissions. Follow page limits when later converting to PDF; do not claim a Markdown word count guarantees PDF pagination.

### DELIVERABLE_1_DRAFT.md

Include:

1. Problem and motivation: finding relevant reading and understanding the neighborhood around a known paper.
2. Dataset/source: sampled paper metadata, directed citations, recommendations, optional abstracts; retrieval strategy and observed missingness.
3. User personas with background, motivations, tasks, context, and challenges. Label personas as design assumptions until validated.
4. Domain tasks and explicit visualization abstraction table.
5. Data types: papers as items, metadata attributes, citations as directed links, recommendation associations as distinct relations, years as temporal/ordered values, text scores as derived quantitative attributes.
6. Scope and data limitations; no assertion of complete corpus coverage.
7. Suggested figures: annotated neighborhood model and task-to-view mapping.

Do not invent interviews or actual dataset statistics before collection.

### DELIVERABLE_2_DRAFT.md and DESIGN_RATIONALE.md

Explain spherical layout, similarity radius, size/color encodings, directionality, linked views, filters, selection, and recenter. Justify each by the task it serves. Discuss occlusion, perspective, peripheral-distance non-meaning, citation-count bias, missing abstracts, sample coverage, and why the list/2D view are necessary. Include screenshot paths from the actual app; do not insert nonexistent figures.

### EVALUATION_PLAN.md

Propose a small formative study with consenting classmates or intended users, e.g. 3–5 participants, with tasks such as finding a reference, comparing two candidates, and identifying a later citing paper in a year range. Compare task use of 3D and 2D/list where practical, counterbalance order, and collect completion, errors, time, and short usability comments. Avoid treating the small sample as proof of general superiority. Include blank observation templates, not invented results. Any bonus-evaluation report must describe what actually occurred.

### DEMO_SCRIPT.md

Target five minutes:

- 0:00–1:00: user problem, seed paper, data source, and bounded neighborhood.
- 1:00–1:45: orbit, select a reference, explain the directed relationship.
- 1:45–2:30: filter citing papers by year; inspect the histogram and list.
- 2:30–3:15: inspect recommendations/text similarity, compare two candidates, save one.
- 3:15–4:00: recenter and return through history.
- 4:00–4:30: demonstrate 2D alternative and explain one design tradeoff.
- 4:30–5:00: summarize task support, data limitations, and any actual evaluation.

Use explicit snapshot mode for presentation reliability. Present the actual implementation and actual evidence.

## 22. Stretch features, only after acceptance

Possible additions: SPECTER embeddings if documented access and field availability are verified; bibliographic coupling when reference sets have genuinely been acquired; real topic clustering with documented methodology; brushing multiple nodes; richer citation context when returned by the provider; BibTeX from verified metadata; a modest user evaluation.

Every added encoding needs a defined computation, source, missing-data policy, and user-task justification. Do not add visual clusters, inferred influence labels, or numerical “importance” scores because they look appealing.

## 23. Risks and decisions already made

| Risk | Required decision |
|---|---|
| 3D looks good but obscures data | Keep 3D identity; provide synchronized list/2D and precise details |
| Local model invents relationships | Explicit edge invariants; test directions and provenance |
| Recommendations mistaken for citations | Separate data structure, dashed links, separate legend/filter |
| Spatial distance overclaims semantics | Radius means local text score only; angles are arrangement |
| Citation counts imply quality | Log scale and clear wording; no quality ranking |
| API throttling blocks presentation | Rate limiting/cache and explicit offline demo |
| Partial retrieval looks exhaustive | Bounded samples, branch statuses, retrieved-versus-total counts |
| Missing abstracts invalidate scoring | Title-only label or unavailable score; no imputation |
| Recenter races create wrong center | Transactional commit and generation-token guard |
| Scope grows into a search platform | Single-provider, bounded ego-neighborhood; no auth/LLM/database |
| Dependency/API drift | Verify official docs, pin compatible versions, record actual smoke checks |

## 24. Official implementation references

Links were consulted when preparing this specification; the implementing model must verify current details if behavior differs.

- [Semantic Scholar Academic Graph API](https://api.semanticscholar.org/api-docs/graphs)
- [Semantic Scholar Recommendations API](https://api.semanticscholar.org/api-docs/recommendations)
- [Semantic Scholar API overview](https://webflow.semanticscholar.org/product/api)
- [Semantic Scholar API tutorial](https://webflow.semanticscholar.org/product/api/tutorial)
- [Semantic Scholar API license](https://api.semanticscholar.org/license/)
- [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)
- [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html)
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Next.js environment variables](https://nextjs.org/docs/pages/guides/environment-variables)

## 25. Required handoff from the implementing model

When finished, provide:

1. Exact project path and local run commands.
2. What works in demo mode and what was verified live.
3. Commands run with actual pass/fail outcomes.
4. Browser QA observations and screenshot locations when available.
5. Data provenance and attribution/storage decisions.
6. Remaining limitations, blocked requirements, and how to resolve them.

The desired outcome is a coherent visualization system that helps someone choose and follow papers around a central publication. Deliver the working application and evidence, not only code scaffolding or a visually attractive canvas.
