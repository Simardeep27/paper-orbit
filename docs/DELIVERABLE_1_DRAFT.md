# Deliverable 1 draft: Dataset, users, tasks, and abstraction

> **Draft status.** This Markdown is a working draft for a future two-page text +
> two-page figure PDF. It is not a final submission, and its length does not
> guarantee PDF pagination. Personas below are design assumptions, not interview
> findings. Final statistics should be regenerated if the snapshots change.

## 1. Problem and motivation

A graduate student starting a literature review often begins with one paper and
faces three different questions at once: what did this paper build on, who has
cited it, and what nearby work might be worth reading next? Search engines return
a flat ranked list. Citation indexes show counts and links but make it difficult
to see the shape of a bounded neighborhood, compare candidates, or keep track of
where a reading path started.

Paper Orbit explores one known paper as a **bounded ego-neighborhood**. It places
the paper at the center and surrounds it with three explicitly separated
relationships: references, citing papers, and provider recommendations. The user
can inspect metadata, filter by year/citation/similarity, compare two candidates,
save a reading list, and recenter on another paper while retaining history.

The product promise is deliberately narrow: help a reader find relevant reading
and understand observed citation connections. It does not claim to map an entire
field, prove influence, measure quality, or provide an exhaustive semantic
neighborhood.

## 2. Dataset and source

### Primary source

- **Provider:** Semantic Scholar Academic Graph and Recommendations APIs.
- **API documentation:** <https://api.semanticscholar.org/api-docs/graphs> and
  <https://api.semanticscholar.org/api-docs/recommendations>.
- **License:** <https://api.semanticscholar.org/license/>.
- **Retrieval date for bundled real snapshots:** October 28, 2026 (UTC).
- **Requested fields:** paper ID, title, year, authors, venue, citation count,
  reference count, URL, external IDs, and abstract when available.
- **Bounded branch limits:** up to 40 references, 40 citing papers, and 20
  recommendations per center, with at most 101 nodes including the center.

Semantic Scholar is an index, not a complete record of all publications. Its
citation coverage favors older, indexed work; missing abstracts and metadata are
normal. The app preserves nulls and counts missing values rather than imputing
them.

### Bundled real snapshots

The main query starts from a seed paper and retrieves its metadata, references, citing papers, and recommendations. Three example query results were acquired through the same server adapter and stored as offline snapshots. The bundled snapshots act as a small offline cache; the prototype uses three manually selected seed papers, and `npm run demo:fetch` can refresh them. The intended production mechanism is to cache the most frequently searched seed papers and refresh them roughly weekly. The current prototype does not include search-frequency tracking or an automatic scheduler.

| Seed paper / query center | Loaded nodes | References | Citing | Recommended | Missing abstracts |
|---|---:|---:|---:|---:|---:|
| Attention is All you Need | 100 | 39 | 40 | 20 | 83 of 99 neighbors |
| A Deep Reinforced Model for Abstractive Summarization | 98 | 40 | 40 | 20 | 86 of 97 neighbors |
| A Learning Algorithm for Continually Running Fully Recurrent Neural Networks | 60 | error (failed branch) | 40 | 19 | 58 of 59 neighbors |

The first two are linked by an observed reference and the second links to the
third, enabling offline recenter/history across real centers. These three are
examples of the main query result, not a fixed dataset of only three papers. The
third's failed references branch is preserved as `error`, not shown as “zero
references.”

### Explicit synthetic demo

A separate hand-authored catalog contains 42 fictional papers and three
neighborhoods. It exists for deterministic interaction tests and presentation
without network access. It is visibly labelled `synthetic-test` everywhere and
must not be cited. Synthetic records are never silently substituted for live or
snapshot data.

### What is not collected

No full text, PDFs, paywalled content, generated summaries, LLM judgments,
embeddings, topics, citation intent, or user accounts. The app stores only
normalized paper metadata, observed relationship edges, recommendation
associations, local similarity scores, and user-saved reading-list entries.

## 3. Users

### Persona A — literature-review starter (primary)

- **Background:** first- or second-year graduate student in computing.
- **Context:** has one seed paper from a course or advisor and needs to build a
  reading list quickly.
- **Motivation:** find the most relevant earlier work and important follow-ups
  without reading a flat search-results list one item at a time.
- **Tasks:** identify a central paper; inspect references; find later citing
  papers; compare candidates; save and export a shortlist.
- **Challenges:** citation counts are biased and do not equal quality; abstracts
  are often missing; provider coverage is incomplete; recommendation rank is not
  a similarity score.
- **Design assumption:** prefers a visual overview first, then precise list
  metadata for decisions.

### Persona B — citation-path researcher (secondary)

- **Background:** researcher or advanced student investigating how a specific
  publication was received.
- **Motivation:** follow a chain of citation neighbors and retain a path back to
  the starting point.
- **Tasks:** filter citing papers by year; inspect a citing paper's relationship;
  recenter; move back through history; compare a citing paper with a reference.
- **Challenges:** a citation may be critical or incidental; direction matters;
  a recenter can lose context if history and filters are not preserved.
- **Design assumption:** values the 2D/list views as much as the 3D overview.

### Persona C — course reviewer / demo audience (tertiary)

- **Background:** instructor or classmate evaluating the visualization.
- **Motivation:** quickly understand what data is real, what is sampled, what is
  synthetic, and whether the interaction supports the stated tasks.
- **Tasks:** inspect provenance, switch modes, verify a relationship, test a
  filter, and read the limitations.
- **Challenges:** an attractive 3D scene can overstate completeness and quality.
- **Design assumption:** needs persistent provenance and explicit non-claims.

These personas are **design assumptions until validated** through the study
described in `EVALUATION_PLAN.md`. No interviews or user counts are claimed here.

## 4. Domain tasks and visualization abstraction

| User question | Domain task | Abstraction | Interface support |
|---|---|---|---|
| What work does this paper reference? | Lookup, inspect adjacency | Directed citation edge; reference membership; year position | Reference filter; cyan nodes; solid arrows; details list |
| Which papers cite this paper? | Lookup, compare temporal distribution | Inbound citation edge; citing membership; year histogram | Citing filter; amber nodes; year range; sortable list |
| What should I read next? | Rank, compare candidates | Recommendation association; rank; local TF-IDF similarity | Violet dashed links; recommendation-rank sort; text-similarity score |
| Which candidates fit my year/citation criteria? | Filter, rank | Inclusive interval; threshold; linked views | Relationship checkboxes, year brush/inputs, minimum citations, local text filter |
| How do two candidates differ? | Compare, identify | Side-by-side metadata, memberships, abstract, score context | Two-item comparison panel with accessible removal |
| What happens if I follow a paper? | Navigate, retain context | Center transaction, bounded history, URL state | Explicit “Make central paper,” history back/forward, loading and error preservation |
| Is this data complete? | Assess provenance | Branch status, received/distinct/skipped, timestamps, missingness | Persistent mode labels and Data info dialog |
| Where did this number come from? | Explain encoding | Local TF-IDF score and coverage | “Text similarity” label, title-only/unavailable coverage, help text |
| How do I use this without a mouse? | Access equivalent information | HTML list and form controls | Keyboard flow, visible focus, 2D/list alternatives |

## 5. Data types and abstractions

| Data | Type | Abstraction | Missing-value policy |
|---|---|---|---|
| Paper | Item | Node/row/details | Required canonical ID; missing title becomes “Title unavailable” |
| Title, authors, venue | Categorical/text attributes | Labels, rows, details | `null`/empty preserved; no invented text |
| Year | Ordered/temporal quantitative attribute | Histogram, filters, list | Unknown bucket; included/excluded explicitly |
| Citation count | Quantitative metadata | Log-scaled node size; sortable value | Unknown distinct from known zero |
| Reference count | Quantitative metadata | Details/provenance | Unknown preserved |
| Citation | Directed link | Solid arrow; reference/citing membership | Only observed endpoint records; no inference |
| Recommendation | Undirected association | Dashed line; candidate rank | Never converted into a citation |
| Membership | Categorical set | Color + text badge | Multiple memberships merged on one node |
| Abstract | Optional long text | Details; TF-IDF document | “Abstract unavailable”; title-only coverage |
| Text similarity | Derived quantitative | Radius (optional), list value | Null when no usable text; never imputed |
| Coverage | Status/count record | Provenance table | `ok`, `empty`, `error`, `unavailable` kept distinct |
| Retrieval time | Temporal metadata | Provenance | ISO timestamp from provider/app |

## 6. Scope, assumptions, and limitations

### In scope

- Single-paper, bounded ego-neighborhoods.
- References, citations, and recommendations as separate relations.
- Three coordinated views plus a year histogram and details/list/comparison.
- Local reading list and Markdown/JSON/PNG/SVG exports.
- Live, stored-snapshot, and synthetic modes with explicit provenance.

### Out of scope

- Complete corpus indexing or exhaustive field mapping.
- Multi-hop crawling, full-text ingestion, or PDF storage.
- LLM summaries, generated claims, citation intent, or topic clustering.
- Embedding-based similarity, paid services, authentication, or databases.
- Mobile 3D feature parity; mobile supports list/2D core tasks.

### Known limitations

- Provider samples are not complete citation graphs.
- Citation counts and coverage are biased by indexing and publication age.
- Abstract absence makes local similarity title-only or unavailable for many
  neighbors; title-only scores can miss conceptual similarity.
- Recommendations are candidates and ranked lists, not measured semantic
  similarity; the app does not display a provider similarity score.
- The 1 request/second provider limit and transient failures require explicit
  partial states and a reliable offline snapshot mode.
- The synthetic demo is fictional and unsuitable for any research claim.
- No formal user evaluation has been completed.

## 7. Suggested figures

1. **Annotated neighborhood model:** center paper, reference/citing arrows,
   recommendation dashes, radius meaning, unknown shell, and membership colors.
   Use `../qa/screenshots/desktop-3d.png` as the base screenshot.
2. **Task-to-view mapping:** a three-column diagram showing lookup/filter/compare
   tasks mapped to 3D, 2D/histogram, list/details/comparison.
3. **Provenance and missingness:** a screenshot of the Data info dialog showing
   branch coverage and missing abstracts, with a caption explaining bounded
   sampling and failed-branch semantics.
4. **Recenter/history path:** a small state diagram for center A → center B →
   back, including the stale-request generation guard.
