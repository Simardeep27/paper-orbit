# Paper Orbit: visual, interaction, and course-readiness review

Reviewed October 28, 2026, through the running application at `http://localhost:3000` using native computer use in Safari on macOS.

## Overall assessment

**This is a substantial working prototype with a strong visual identity. It is suitable material for the prototype deliverable, but I would improve the analytical readability, missing-branch presentation, and accessibility before using it as the final demonstration.**

The dark observatory theme is consistent across the landing page, controls, node colors, badges, and details panel. The application already does more than render an attractive graph: selection, coordinated filtering, comparison, reading-list persistence, provenance inspection, live data acquisition, and a successful recenter/back workflow were observed.

The main gap is between looking like a visualization tool and making its encodings easy to read. The sphere conveys a neighborhood, but its dense spokes, overlapping labels, uncalibrated radius, and perspective-dependent node sizes make it difficult to answer precise comparison questions directly. The list and timeline help, although both need refinement. Data limitations are thoughtfully disclosed, but some primary interface elements still contradict or bury those disclosures.

This review is not a predicted grade. The course assesses the submitted explanation, design rationale, implementation, and presentation together; those written artifacts and the source code were not audited here.

## Review method and limits

### What was actually inspected

- Landing page and search controls.
- Stored Semantic Scholar snapshot search for `Attention`.
- The stored neighborhood around **Attention is All you Need**, canonical ID `204e3073870fae3d05bcbc2f6a8e263d9b72e776`.
- 3D and 2D graph presentation, direct 3D selection, and live-view camera orbiting.
- Relationship filtering, inclusive year inputs, reset behavior, graph/list/count coordination, and histogram context.
- List mode, two-paper comparison, save action, and reading-list count after reload.
- An unavailable snapshot-recenter attempt.
- Live search for **A Nested Model for Visualization Design and Validation**.
- Its live neighborhood, ID `e8cfef98279aabd43f65d465b304345aec15d9bb`, and the rate-limited references branch.
- The provenance and help dialogs, including Escape to dismiss help.
- Synthetic demo selection, successful recenter from `syn-paper-001` to `syn-paper-002`, and browser Back.

### Evidence standard

Observations below come from visible screenshots and the native accessibility tree. Root causes and proposed remedies are identified as recommendations, not facts about source code. Screenshots were viewed during the session; no screenshot files were saved with this report. Reproduction paths and exact observed values are provided instead.

### Not verified

Mobile/responsive breakpoints, actual VoiceOver use, complete keyboard traversal, contrast ratios measured with tooling, WebGL context-loss recovery, reduced-motion behavior, export file contents, DOI/arXiv resolution, the complete stored-snapshot catalog, memory behavior, FPS, upstream scheduling implementation, unit tests, production build, and deployment were not verified. Do not describe these as passed on the basis of this review.

There was an interruption when the active browser changed to unrelated content. Live loading did complete, but the interruption prevents a trustworthy load-time measurement. A separate Chrome for Testing window was attempted but did not produce additional app evidence. The substantive findings are from Safari.

## Observed behavior and evidence

| Check | Observed result | Assessment |
|---|---|---|
| Landing visual design | Consistent cyan/violet identity, clear search, strong orbital illustration | Strong aesthetic foundation |
| Browse stored snapshots | Opens a snapshot-mode search screen without a visible catalog | Discoverability weakness |
| Snapshot search | `Attention` produced ten results, including the intended paper | Worked |
| Stored neighborhood | 99 neighbors: 39 references, 40 citing, 20 recommended; 100 total nodes | Worked; membership counts need not sum to unique count in general |
| Direct 3D selection | Clicking a visible node selected Neural Machine Translation by Jointly Learning to Align and Translate | Worked; details showed reference evidence |
| Relationship filters | Keeping only Citing reduced visible neighbors to 40 | Worked; count/list/timeline context agreed |
| Hidden selection | Filtering out the selected reference cleared selection and announced the reason | Worked |
| Year filter | With Citing selected, inclusive 2026–2026 reduced 40 context papers to 1 visible paper | Worked after input commit/blur |
| Histogram context | Retained 40 context papers while the year-filtered result was 1 | Correct coordinated-view behavior |
| Reset filters | Restored 99 visible neighbors | Worked |
| 2D view | Real selectable radial map with accessible paper descriptions and explicit citation directions | Worked, but label scale/overlap weak |
| Main List mode | Visible sortable rows rendered, but the main Neighborhood visualization container had no exposed descendants in a fresh full Safari accessibility tree | Significant accessibility concern; reproduce and diagnose |
| Mouse list selection | Clicking Weighted Transformer and Parallel Attention updated details | Worked visually despite the accessibility-tree gap |
| Comparison | Added both papers; two comparison cards appeared with metadata and scores | Worked |
| Reading list | Saved Parallel Attention Mechanisms in Neural Machine Translation; count remained 1 after reload | Persistence observed |
| Missing snapshot recenter | Attempting to recenter on an unstored candidate preserved the original graph and showed an explanation | Correct failure preservation; action design could improve |
| Live search | Exact title search found A Nested Model for Visualization Design and Validation | Worked |
| Live neighborhood | 59 unique neighbors: 40 citing, 19 recommended; references failed | Partial success, not a complete graph |
| Live failure explanation | Provenance said References: error; Rate limited while loading references | Correct distinction in detailed provenance |
| Live primary counts | Main controls still showed Reference 0 | Ambiguous/misleading without reading branch details |
| Orbiting | Dragging changed camera orientation and node positions on screen | Worked; no measured FPS claim |
| Help dismissal | Escape closed the help dialog | Worked |
| Demo recenter | A Field Guide to Citation Neighborhoods became center with 15 neighbors | Worked |
| Browser Back | Restored Orbital Cartography for Research Literature with 20 neighbors and 2D mode | Worked for this center/view transition; filter restoration across centers was not separately tested |

## Course-rubric assessment

### Deliverable 1: data, users, tasks, and abstraction — 40 project points

| Criterion | Points | Current evidence | What the submission still needs |
|---|---:|---|---|
| Dataset description | 5 | Provider, retrieval time, sample limits, branch coverage, and missing values are visible | Explain acquisition, relation semantics, sampling bias, and actual dataset statistics in the report |
| User identification | 10 | Literature-review use is implied by search, comparison, and reading list | Explicit intended users, background, motivations, context, and constraints; distinguish assumptions from research |
| Task identification | 10 | Reference lookup, citing-work filtering, candidate comparison, and reading selection are implemented | Several specific user questions and why each matters; avoid a list of interface features standing in for tasks |
| Data/task abstraction | 15 | Items, directed citation links, separate recommendation relations, temporal attributes, counts, and derived text scores are represented | A clear abstraction table and task-to-view mapping; explain what angular position and peripheral distances do not encode |

The application cannot substitute for this written work. Deliverable 1 is due **November 5, 2026**, following the extension, with a maximum of two text pages plus two figure pages.

### Deliverable 2: prototype and rationale — 15 project points

The app supplies enough functional material for a strong prototype submission. Include actual screenshots of a useful task sequence, an encoding table, coordinated-view behavior, and rationale for 3D plus list/2D alternatives. Discuss the tradeoffs rather than treating the spherical form as self-justifying. The due date is **November 24, 2026**, with a maximum of two text pages plus three figure pages.

### Final system and demonstration — 45 project points

| Criterion | Points | Readiness judgment |
|---|---:|---|
| Data clearly explained | 2.25 | Strong provenance foundation; primary failure counts and sample-year anomalies need clarification |
| Problem motivated | 9 | Useful problem, but present a specific student's research question rather than giving a generic feature tour |
| Proposed solution explained | 4.5 | Controls/legend exist; quantitative radius and size need better calibration |
| Solution fits data/problem | 9 | Linked views fit the tasks; the 3D view needs stronger evidence of usefulness beyond presentation appeal |
| Correct implementation | 11.25 | Many flows worked; accessibility-tree omission and incomplete live branches require attention; full correctness not established |
| Meaningful interactivity | 4.5 | Strongest area: observed filtering, selection, comparison, save, recenter, and Back |
| Functional working tool | 2.25 | Working prototype and partial live success; prepare a reliable real-data snapshot path |
| Presentation and delivery | 2.25 | Visual identity is ready; narrative, readable labels, reliable seeds, and a rehearsed five-minute task flow need work |

All teams must be ready by **December 8, 2026**. Source code, runnable system, and README are required. Optional user evaluation can earn up to five bonus project points; no user-study results were established here.

## Detailed findings

### F01 — Main list mode is missing from Safari's accessibility tree

**Priority: P0 before final submission. Confidence: observed symptom; root cause unverified.**

After switching from 2D to List, rows remained clearly visible and mouse-selectable. However, a full accessibility-tree refresh showed the Neighborhood visualization container with no descendants: its toolbar, sort control, and rows were absent. The details panel, filters, timeline, and lower Reading list/Compare tabs remained exposed. This persisted after a page reload into `view=list`.

This weakens the app's claim that the list is a keyboard-friendly alternative. It also affects automated inspection and assistive-technology users. Investigate hidden/aria-hidden/inert states, list-mode parent wrappers, role usage, and focus behavior. The review does not establish which attribute or component causes it.

Acceptance: in Safari and another browser, the active list toolbar and every visible row/action are discoverable, named, and operable by keyboard and assistive technology. Inactive views must not remain in the focus order.

### F02 — Failed reference acquisition is rendered as Reference 0 in primary controls

**Priority: P0. Confidence: directly observed in live mode.**

The live Munzner neighborhood reported a rate-limited references branch. The yellow global warning and detailed provenance correctly explained partial acquisition, but both the relationship filter and main branch totals displayed a plain zero for references. The center's metadata also reported 53 provider references. Those are different quantities, but a user can easily read Reference 0 as an empty bibliography.

Use a branch-specific unavailable/error state in the primary counts, such as “References unavailable — rate limited,” with an explicit retry path. A successfully retrieved zero should remain distinguishable. Do not discard the working citing/recommendation results.

### F03 — 3D labels overlap exactly where the important comparisons occur

**Priority: P1. Confidence: repeatedly visible in both reviewed real neighborhoods.**

The central label and several peripheral labels overlap around the center, obscuring nodes and one another. In the live graph, labels for the center, Model Literacy, Design Knowledge, and Visualization Autocomplete overlapped in the same region. Camera rotation changes the overlap but does not reliably solve it.

Keep the center label protected, reserve priority for selected/hovered nodes, and suppress lower-priority labels using screen-space collision checks. Offer explicit label density control and a focus-on-selection mode. The full title remains in details. Avoid moving nodes to fix text collisions if that would alter the radius encoding.

### F04 — Radius and size are described but not quantitatively readable

**Priority: P1. Confidence: visual inspection.**

The legend explains radius as local text similarity and size as citations. It does not provide useful numerical radius landmarks or reference-size examples. In 3D, perspective changes apparent size and distance, so users cannot reliably compare scores or citation counts from glyphs alone. The precise score exists in details, which is a good foundation.

Add calibrated similarity guides in 2D and a clear guide or companion score indicator in 3D. Include representative citation-size examples and state the log scale. Explain whether glyphs are world-sized or screen-sized. Preserve the existing warning that angular arrangement is not a topic map.

### F05 — The timeline needs a trustworthy temporal axis and count scale

**Priority: P1. Confidence: visible design weakness; axis implementation requires confirmation.**

The timeline is a thin row of bars with year labels but no visible quantitative count axis. Small counts are nearly indistinguishable. In the Attention snapshot, widely different year intervals appeared at similar horizontal spacing, suggesting placement by observed-year categories rather than continuous elapsed time. Verify the implementation before treating this as a confirmed scale bug.

Use a true year domain with missing years represented as zero bins, or clearly label a categorical-year chart. Add count ticks, accessible year/count tooltips, and a clear selected-range treatment. Put unknown years in a separated categorical bucket. Label the chart as a fetched-sample distribution, not field-wide growth. Numeric year controls and context preservation already work and should be retained.

### F06 — Most reviewed papers lack abstracts; similarity needs an explicit evidence policy

**Priority: P1. Confidence: direct provenance values; ranking consequences are a design risk.**

- Attention snapshot: **83/99 neighbors lacked abstracts**, approximately 84%.
- Live Munzner graph: **53/59 lacked abstracts**, approximately 90%; the central paper also lacked an abstract.

The app labels title-only scores and discloses the limitation, which is good. However, mixing title-only and title-plus-abstract evidence in one radius/ranking can reflect text availability as well as topical relation. The main visual layout still gives those scores strong prominence.

Keep the distinction visible near the graph and offer a controlled title-only scoring mode across all papers, or another documented policy that makes comparisons more consistent. Show corpus/coverage context and label scores as local lexical similarity, not semantic relevance. Investigate whether abstract enrichment is feasible within the API/request budget; do not promise it will succeed or fetch every node indiscriminately.

### F07 — The displayed citation sample is temporally skewed and includes many 2027 records

**Priority: P1 for the presentation dataset. Confidence: observed metadata; cause unverified.**

The Attention snapshot showed many citing papers with publication year 2027, although this review is dated October 28, 2026. Keeping only citing papers produced 40 neighbors; the inclusive 2026-only interval left one. Future issue-year metadata can be legitimate, so this is not evidence of fabrication. It is a reason to inspect source dates, explain the sampling policy, and choose a more educationally representative presentation snapshot.

The graph should not imply that the fetched citing sample captures the historical development of Transformers. Distinguish current provider order from a designed historical sample. If a curated teaching sample is added, label its selection method and preserve the raw provider provenance.

### F08 — Snapshot browsing does not surface available centers

**Priority: P1. Confidence: direct navigation observation.**

Browse stored snapshots led to a search screen, not a visible list of the stored centers. After entering Attention, many results were shown, but inspected neighbors generally did not have stored neighborhoods. The app warns about this in details, yet the prominent Make central paper action still leads to a predictable failure.

Show a catalog of actually stored centers with dates/counts and clear recenter availability. Separate “available offline” from “can be inspected from this snapshot.” Offer “Open live neighborhood” as a separate, deliberate action when appropriate. A complete offline demonstration should have a known connected pair of stored real-paper neighborhoods; that was not verified here.

### F09 — Spatial graphics emphasize decoration over paper identification

**Priority: P1/P2. Confidence: visual assessment.**

The sphere has an attractive wireframe shell and dense spokes, but many paper marks are tiny while large parts of the graph viewport remain empty. In 2D, the paper labels are substantially smaller than surrounding interface text. The outer segmented rings add visual complexity without an obvious quantitative reading.

Improve camera fit and graph-area utilization, reduce decorative grid intensity, expose selected-neighbor focus, and increase label legibility. Keep a deliberate limit on labels rather than turning every paper into a text cloud. A presentation mode could enlarge the active visualization and collapse side panels without hiding access to details.

### F10 — The table-like paper list lacks visible column headings

**Priority: P1. Confidence: observed in main list mode.**

Rows include year, venue, membership, a bare numeric citation count, and a text score. Without a visible header row, users must infer what numbers such as 143 and 0.38 mean. Several titles and venues wrap or truncate.

Add aligned headers or compact field labels, accessible row/action semantics, sticky context where useful, and full-value disclosure. Keep global provider citation counts distinct from loaded graph degree. Number formatting such as 199,000 improves scanning.

### F11 — Loading/help copy exposes implementation mechanics

**Priority: P2. Confidence: visible copy.**

The live loading overlay named a long paper hash and described how only the latest recenter request can replace the graph. Help described the SVG renderer as real SVG rather than a screenshot. Those details explain implementation, not the user's task.

Use the requested title when available: “Loading the neighborhood around A Nested Model…” with short progress and a cancel/retry option. Help should lead with user goals and interaction meanings. Keep implementation and concurrency explanations in technical docs.

### F12 — Provenance is strong, but copy can contradict the current mode

**Priority: P2. Confidence: direct modal text.**

The snapshot modal correctly said Stored snapshot, but its warnings included “This is a bounded live sample.” This may mean live at capture time, but the current wording is ambiguous. A warning also said provider totals and retrieved counts were shown separately in Data info, while the modal itself said provider-side totals were not claimed there.

Use mode-aware provenance wording. Either show provider totals with retrieval context or point explicitly to the center metadata panel. A small wording cleanup will strengthen an already useful data-quality feature.

## What to preserve

- The product's visual theme and three distinct relationship colors.
- Explicit distinction between citation edges and recommendation associations.
- Center-relative relationship explanations in details.
- Missing-value labels and title-only score labels.
- Inclusive numeric year controls and the non-collapsing histogram context.
- Selection clearing when a filtered node disappears.
- Separate select versus recenter actions.
- Comparison, local reading-list persistence, and visible source links.
- Transparent synthetic/snapshot/live modes.
- Preservation of the current graph when an unavailable snapshot recenter is attempted.
- Successful demo recenter and browser Back behavior.

## Recommended five-minute final demonstration

Use a verified real-paper snapshot with adequate metadata and a second stored center. Avoid relying on a fully successful live acquisition during the assessed presentation; live partial failure was observed here.

1. State the intended user and one real literature-review question.
2. Explain center, references, citing work, and recommendations using one example each.
3. Select a reference; show the exact evidence sentence and source.
4. Filter citing papers by a meaningful year interval; use the timeline and list to answer the question.
5. Compare two plausible candidates and explain why one enters the reading list using actual metadata, not an invented quality score.
6. Recenter on a known stored neighbor and return with Back.
7. Show the 2D/list alternative and explain one visual tradeoff plus one data limitation.

Spend approximately one minute on context and three minutes on the actual workflow, leaving time for the design rationale. Do not spend most of the demonstration rotating the globe or reciting controls.

## Work order

1. Repair/reproduce the main List-mode accessibility gap and show branch-specific failure states.
2. Fix label collisions, quantitative guides, timeline readability, and table headings.
3. Establish a defensible similarity/coverage policy and a representative presentation snapshot.
4. Expose stored-center availability and rehearse a real-data recenter/back path.
5. Validate laptop/mobile layouts, keyboard/VoiceOver, reduced motion, exports, performance, and production build.
6. Update course report figures/rationale and run a small task-based evaluation if feasible.

The companion file `LOCAL_AGENT_ENHANCEMENTS_2026-10-28.md` converts these findings into implementation tasks and acceptance checks.

## Review side effects

One paper was added to this Safari browser's reading list for the persistence check: **Parallel Attention Mechanisms in Neural Machine Translation**. Its saved count remained one after reload. Comparison selections were reset by reload. No source code, configuration, API key, or account setting was changed during this review. Only the two review documents were written to the project.

## Rubric sources

- [Canvas course](https://umamherst.instructure.com/courses/41998)
- [Semester Project Details](https://docs.google.com/document/d/1ShgQnrL19hbXz7IlN-VxgkXYpHOHSHCx_A_ISWrAqnY/edit)
- [Deadline extension](https://umamherst.instructure.com/courses/41998/discussion_topics/605803)

These course requirements were read earlier in this conversation. They were not independently re-opened during the app review.
