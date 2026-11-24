# Paper Orbit enhancement brief for the local coding agent

Prepared October 28, 2026. Read alongside `COMPUTER_USE_REVIEW_2026-10-28.md` and the existing `BUILD_SPEC.md`.

## Mission

Improve the existing working app for COMPSCI 571 submission. Preserve the spherical identity, correct observed behaviors, and current architecture where practical. Do not rebuild the product, replace the dataset with invented records, or add unrelated features.

This brief comes from a computer-use review of the running Safari app, not a source-code audit. Reproduce each defect before diagnosing its cause. Statements about potential root causes are hypotheses. Inspect current files, applicable AGENTS.md, and installed framework docs before coding. Another agent may be working in the repository; preserve unrelated changes and coordinate through normal project workflow.

Finish each prioritized task with evidence. Use exact test results and actual screenshots; never claim unperformed verification. No external deployment, paid service, or remote LLM is required. Keep API keys server-only and out of logs/artifacts.

## Known-good behaviors to protect

- Stored Attention neighborhood loads 99 neighbors: 39 references, 40 citing papers, 20 recommendations.
- Clicking a 3D paper updates exact details and relationship evidence.
- Relationship filters, year inputs, visible counts, list, and histogram context agree.
- Hiding the selected neighbor clears its selection with an announcement.
- Two-paper comparison and reading-list save work; a saved paper survives reload.
- Unavailable snapshot recenter preserves the current graph and explains the failure.
- Live title search works, and a partial graph remains usable when one branch fails.
- Synthetic `syn-paper-001` → `syn-paper-002` recenter works; browser Back restores the original center and view.
- Help dismisses with Escape.

Do not regress these while refining visual design.

## Priority definitions

- **P0:** correctness/access blockers to resolve before final submission.
- **P1:** changes that materially improve analytical usefulness and rubric alignment.
- **P2:** polish and presentation refinements.

## P0-01: expose the main List view to assistive technology

### Reproduction

1. Open `/explore?center=204e3073870fae3d05bcbc2f6a8e263d9b72e776&mode=snapshot`.
2. Switch to 2D, then List.
3. Refresh the native Safari accessibility tree; also test a direct reload with `view=list`.
4. During review, the list rows and controls were visible and mouse-operable, but the entire Neighborhood visualization container had no exposed descendants. Other panels remained exposed.

### Investigation

Inspect active-view wrappers, `aria-hidden`, `inert`, hidden attributes, CSS visibility/display, role relationships, SVG/list wrappers, and focus management. Do not assume a particular cause from this brief. Check whether a state intended for an inactive canvas is hiding the active list parent. Also inspect any nested interactive controls or table-role mismatches.

### Required result

- Active list toolbar, sort control, rows, save/compare controls, and relevant links are named and exposed in Safari and Chromium.
- Use a real semantic table with appropriate headers, or a properly labeled list with buttons; do not make a giant clickable interactive container around nested buttons.
- Row selection uses Enter/Space where appropriate; save/compare buttons have distinct accessible names.
- Inactive views are absent from focus order, while active controls remain available.
- Verify VoiceOver manually if available. DOM assertions alone do not establish a native accessibility pass.

### Evidence

Add a regression test covering active/inactive semantics plus a native-browser accessibility observation. Record exact browser and steps.

## P0-02: represent failed branches as unavailable, not empty

### Reproduction

Live center `e8cfef98279aabd43f65d465b304345aec15d9bb` loaded 59 neighbors: 40 citing, 19 recommended. References failed with a rate-limit error. Provenance correctly showed `error`, but the main relationship filter and branch summary showed Reference 0.

### Required result

- Introduce a presentation selector based on branch status, count, and error reason.
- `ok`/`empty` with zero may show 0; `error`/`unavailable` must show an explicit unavailable/error label and icon, not a bare zero.
- Keep global metadata referenceCount separate from retrieved branch size.
- Include the specific branch in the main warning: “References could not load because of a rate limit. Citing papers and recommendations are available.”
- Provide a bounded retry action for failed branches when supported, reusing successful results/cache. Respect existing scheduling/backoff and do not trigger retry loops on render.
- Disable or explain selection of an unavailable relationship. Do not silently return an empty graph as if no references exist.
- Keep successful branches and selection/filters intact when retrying; update scoring/layout only through an explicit data-refresh transaction.

### Tests

Fixtures for genuine zero, branch 429, branch timeout, malformed branch payload, and recovery. Assert main label and provenance agree. Assert retry does not refetch every already-successful branch unnecessarily or exceed caps.

## P1-03: prevent label collisions and protect the center

### Observed problem

Both real graphs placed several labels over the center title and over one another. In 2D, peripheral labels were very small relative to interface text. Sparse nodes and dense spokes compete with labels.

### Implement

- Explicit label priorities: center > selected > hovered > compared > optional contextual labels.
- Screen-space rectangles with collision rejection against higher-priority labels and reserved UI overlays.
- Avoid duplicate center/selected labels when they refer to the same node.
- Keep labels clamped within scene viewport; suppress labels for occluded/back-facing nodes as appropriate.
- A small density setting: Essential / Context / More. Essential should show center, selection, and hover without overlap.
- Hover/selection reveals full title in a stable tooltip/details area; long labels use sensible truncation.
- Minimum readable label size; scale labels for presentation rather than world-unit size.
- Optional selection focus that dims unrelated marks and emphasizes a small useful neighborhood.

Do not move data positions to solve text overlaps when radius encodes similarity. Changing text layout is safe; changing encoded radial values is not.

### Acceptance

Capture 3D and 2D at initial camera and two rotated orientations for Attention and Munzner seeds. No lower-priority label obscures the center/selected title. Labels and tooltips do not cover essential controls. Graph/list selection stays synchronized.

## P1-04: make the encodings quantitatively interpretable

### Implement

- Similarity-radius guide with representative numerical values, preferably clear rings in 2D and a readable explanatory guide in 3D.
- Explain that closer to center means higher local text score; angle and peripheral distance mean arrangement only.
- Add example citation-size marks with counts and explicit log-scale wording.
- Audit perspective effects. If node size varies with depth, disclose that precise comparison belongs in the list or implement a carefully documented screen-size encoding. Do not silently redefine size semantics.
- Show actual score in the selected/hovered paper display and highlight the corresponding radius/guide when feasible.
- Keep unknown count glyphs distinct from known zero and do not generate a numeric score for unavailable text.

### Acceptance

A new user can identify direction of similarity, approximate score bands, citation-size meaning, and the non-meaning of angles without reading the implementation docs. Test deterministic layout and unchanged coordinates/scales under UI filters.

## P1-05: rebuild the year chart as a readable quantitative view

### Investigate first

During visual review, unequal elapsed-year intervals appeared equally spaced. Determine whether x positions use observed-year categories. Do not call it a source-code bug until verified.

### Implement

- A continuous chronological year domain, or annual bins covering the full min–max interval with zero bins retained.
- A labeled count scale with baseline and a few clear ticks.
- Hover/focus details: year, context count, selected count where relevant.
- An explicit brush selection with handles and a clear reset action; retain inclusive numeric inputs.
- Unknown-year bucket visually separated from chronological positions.
- Keep the existing context rule: all filters except year define context; year interval defines selected subset.
- Maintain sample-only wording; do not imply publication growth in an entire field.
- If large skew makes small counts invisible, allow an explicitly labeled alternate scale or a focused range; do not distort bars silently.

### Tests

Sparse fixture years 1993, 2006, 2014, 2017; verify spacing reflects elapsed time and missing years are represented. Test unknown years, a single-year dataset, all unknowns, no results, and year interval 2026–2026. Context must not collapse under its own brush. Verify brush pixels map back to inclusive year values correctly.

## P1-06: establish a consistent similarity-evidence policy

### Evidence

Attention snapshot: 83 of 99 neighbors missing abstracts. Live Munzner graph: 53 of 59 missing abstracts; center abstract unavailable. Existing coverage labels and TF-IDF caveat are helpful but insufficient to make all numerical comparisons equivalent.

### Implement

- Add a concise coverage indicator near graph/list: number with abstracts versus title-only.
- Offer a documented uniform title-only scoring mode as a reproducible baseline, or another explicitly justified consistency policy.
- If retaining title-plus-available-abstract mode, label that evidence varies. Do not equate its scores with uniform title-only scores.
- Scoring mode is part of cache/run metadata, URL/session state as appropriate, export provenance, and legend.
- Freeze each run's scores/layout through filtering. Change the run only on explicit mode/data refresh or recenter.
- Do not transform citation count into relevance or provider recommendation rank into a similarity number.
- Optional metadata enrichment must be deliberate, cached, capped, and rate-limited. Treat missing provider abstracts as genuinely unavailable if enrichment fails.

### Acceptance

Document the computation and its limitations with an example. Unit-test coverage labels when the center lacks an abstract. Verify changing filters leaves score values unchanged. No labels such as “82% relevant” or “semantic certainty.”

## P1-07: prepare representative real-data presentation snapshots

### Evidence

The Attention citing sample was dominated by records labeled 2027; a citing-only 2026–2026 filter produced one result from 40 context papers. Future issue dates may be valid. This is a provenance/sampling question, not proof of invalid data.

### Implement

- Inspect provider timestamps, publication-year fields, sample order, and fixture provenance.
- Preserve actual values; do not rewrite future years to the current year.
- Explain provider-order sampling and flag future publication-year metadata neutrally where useful.
- Pick a presentation seed whose retrieved metadata supports meaningful comparisons and a readable temporal story.
- Provide at least two real stored centers with a genuine navigable link, subject to source/storage permissions.
- If constructing a curated historical subset, name it “curated” and record the actual selection method, limits, and source. Do not call it an unbiased random sample or exhaustive graph.

### Acceptance

Run the full demo without network access using permitted snapshots. Recenter successfully to the second stored real center and Back to the first. A report can trace every shown paper/link to its source metadata. No synthetic record is relabeled as real.

## P1-08: make offline availability discoverable

### Implement

- Browse stored snapshots opens an actual catalog of stored center papers.
- Each card shows title/year, retrieval time, branch availability, and Open neighborhood.
- Search results distinguish centers with stored neighborhoods from papers only available as members of someone else's snapshot.
- For an unstored selected neighbor, provide a plainly disabled offline-recenter action with reason, or a separate explicit “Open live neighborhood” option. Do not present a known failing action as the primary successful path.
- Distinguish the search provider selection from the loaded graph's provenance if they differ.

### Acceptance

From the home page, a first-time user can open a real stored neighborhood without guessing a query. The app never silently switches synthetic/snapshot/live sources. Browser history remains coherent.

## P1-09: add list column headings and improve comparison scanning

- Main list needs visible and accessible headers: Paper, Year, Venue, Relationship, Citations, Text score, Actions.
- Use local-sort wording and null-last behavior; format large numbers with separators.
- Provide full title/venue through details or accessible disclosure without requiring hover only.
- Comparison cards should align comparable fields and maintain context for center-relative scores.
- Show when a comparison item is not in the current graph or not scored against this center.
- Keep row/action focus visible; fix accessibility before adding table polish.
- Avoid duplicating the same enormous list in two places. Switching List mode should have a clear workspace model.

Acceptance: users can identify what every number represents, compare year/count/score without scanning prose, and operate save/compare without selecting a row accidentally.

## P2-10: refine scene fit and presentation layout

- Improve graph fit to available viewport; avoid a small cluster in a very wide scene.
- Reduce shell/grid intensity and unnecessary ornament around dense papers.
- Add a presentation/focus mode that collapses rails and enlarges the active graph, with easy details access.
- Keep the central paper title and a compact legend visible.
- Consider a task-oriented shortcut such as “Explore references” or “Compare candidates” that configures existing views, without pretending it determines the correct answer.
- Audit laptop-height layouts, independently scrollable panels, and sticky header interactions. Do not hide primary actions at the bottom of a long abstract.

Acceptance: a 1366×768 or similar laptop-sized viewport has reachable primary actions; titles/tooltips remain readable in actual screenshots. Do not claim mobile QA from the large desktop review.

## P2-11: replace implementation copy with task-focused copy

- Loading uses the known paper title, not an opaque 40-character ID, whenever available.
- Replace concurrency explanation with useful progress/status text. Keep technical details in docs.
- Help describes what users can learn and how to interact, not which renderer technology was used.
- Snapshot warnings say “captured sample” or “stored snapshot,” not unqualified “live sample.”
- Make provider total versus loaded total wording consistent between details and provenance.
- Place numerical precision consistently: score 0.38 in list, optionally more detail on demand, not false precision as a relevance probability.
- Retain clear error recovery actions and current graph preservation.

## Required regression/verification pass

Use the existing tests, extending only where needed to cover these material behaviors. Do not add superficial tests that simply mirror components.

1. Existing unit/component tests, lint, typecheck, and production build.
2. E2E snapshot flow: open → select → filter → compare → save → reload.
3. E2E recenter race/failure/history, including actual prior filter restoration.
4. Simulated partial branch 429 with unambiguous main labels and bounded retry.
5. Main List-mode native accessibility and keyboard operation.
6. Mobile and laptop layouts, 200% zoom, long titles, long abstracts, and empty states.
7. Reduced motion and WebGL failure/context loss.
8. Markdown/JSON/SVG/PNG export content and format correctness for supported exports; don't assert success just because a button exists.
9. Actual performance observations with node count, browser, hardware, and method. Keep target FPS separate from measured FPS.
10. Production-server browser verification, not only the development server.

Live API checks should be opt-in, low-volume, and rate-limited. Deterministic tests must work without credentials. Never use a large request burst as a rate-limit test against the real provider.

## Course-document updates

After fixes, update existing drafts rather than replacing them with marketing text:

- Deliverable 1: actual dataset counts/missingness, intended users, meaningful tasks, and data/task abstractions. Respect maximum two text pages plus two figure pages when converted to PDF.
- Deliverable 2: actual before/after screenshots, encoding table, interaction rationale, 3D tradeoffs, and coordinated views. Respect maximum two text pages plus three figure pages.
- Final README: exact local/demo/live instructions and known constraints.
- Five-minute demo: one user question, evidence-backed lookup, filter, comparison/save, recenter/back, limitation.
- Optional evaluation: conduct actual tasks with consenting intended users; report observations honestly. Do not fabricate results or claim a small study establishes general superiority.

## Definition of done

Create an implementation follow-up report listing each task ID, what changed, files changed, tests run, browser evidence, and any remaining limitations. P0 items require reproduced-and-fixed evidence or a clear documented blocker. P1 design judgments require screenshots and task-oriented explanation, not only test passes.

The final result should retain the distinctive paper world while making the research questions easier to answer and the evidence more trustworthy.
