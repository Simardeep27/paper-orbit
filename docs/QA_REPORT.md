# QA report

**Project:** Paper Orbit  
**Verified:** October 28, 2026; public deployment re-verified November 24, 2026<br>
**Environment:** local macOS review machine and Vercel production; Node.js 24.10.0; npm; Chromium via Playwright 1.64.1
**Scope:** engineering verification, browser QA, real-data acquisition, and visual evidence. This is **not** a user study. The evaluation plan is deliberately blank and future-facing.

## 1. Release summary

| Gate | Result | Evidence |
|---|---|---|
| Clean dependency install | **Pass** | `qa/npm-ci-final.txt` |
| Lint | **Pass** | `qa/lint-final.txt` |
| TypeScript | **Pass** | `qa/typecheck-final.txt` |
| Unit/component tests | **Pass** — 13 files, 100 tests | `qa/unit-final.txt` |
| Production build | **Pass** | `qa/build-final.txt` |
| End-to-end tests | **Pass** — 16/16, 23.0 s | `qa/e2e-run-final.txt` |
| Browser console errors | **None observed** | `qa/final-qa.json`, `qa/accessibility-check.json` |
| Live provider smoke check | **Pass** — OpenAlex public deployment; keyed Semantic Scholar historically passed after one retry | Vercel smoke check; `qa/live-verification.json` |
| Stored real snapshots | **3 centers, 2 offline-recenter links** | `data/snapshots/manifest.json` |
| Synthetic demo | **42 papers, 3 neighborhoods, labelled** | `data/demo/` |
| Secret scan | **No key material in source, docs, or build** | credential-prefix scan; only `.env.example` present |
| Formal user evaluation | **Not run** | `docs/EVALUATION_PLAN.md` |

**Conclusion:** the implementation and engineering verification are complete.
The public Vercel deployment uses key-free OpenAlex live mode; the repository
also retains the optional keyed Semantic Scholar provider and stored Semantic
Scholar snapshots. Remaining caveats are data/licensing limitations, transient
live-provider variability, unusually high abstract missingness, and the absence
of a user study.

## 2. Clean install and build

```bash
cd /Users/ssethi/Documents/build/paper-orbit
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Observed:

- `npm ci` added 573 packages in 9 s.
- `npm audit` reports **1 low-severity, dev-only** advisory: `esbuild` arbitrary
  file read when running its development server on Windows
  (`GHSA-g7r4-m6w7-qqqr`, CVSS 2.5). It is not in the production runtime and the
  build targets macOS/Linux review. The dependency is pinned through `tsx` and
  Vite; no automatic major upgrade was applied during QA.
- `npm run lint` completed with no findings.
- `npm run typecheck` completed with no findings.
- `npm test` passed **13 files / 100 tests** in 3.18 s.
- `npm run build` compiled successfully, ran TypeScript, and generated the static
  and dynamic routes (`/`, `/about`, `/reading-list`, `/explore`, four API
  routes).
- `npm run test:e2e` passed **16 tests** in 23.0 s against a production server.

The Playwright configuration builds and starts production, but reuses an existing
server on port 3100. For this run, the server was restarted after the clean
install/build before browser QA.

## 3. Automated test coverage

### Unit/component — 100 tests

The suite covers, among other things:

- Zod schemas, identifier canonicalization, and malformed provider payloads.
- Paper/neighborhood normalization, deduplication, overlaps, self-edge and
  center-as-neighbor removal.
- Graph selectors, filter semantics, counts, unknown years/counts, histogram
  context, stable layouts, and frozen size scale.
- TF-IDF similarity, title-only coverage, null handling, and deterministic
  output.
- URL parsing/serialization and source-mode round trips.
- Explorer store: stale-response generation guard (an older response cannot
  overwrite a newer center), failure preservation, catalog-only recenter block,
  history/cache restoration.
- Provider rate limiter, retry/error mapping, and configuration.
- Synthetic demo catalog/neighborhoods and the three real snapshot centers.
- Snapshot manifest integrity, attribution fields, failed branch preservation,
  and no API-key material in fixtures.
- Search box, filter panel, paper list/rows, reading-list page, and reading-list
  export.
- Reading-list persistence and filename sanitization.

### End-to-end — 16 Playwright tests

1. Demo search opens the center in all three views.
2. Filters keep graph, list, counts, and histogram in agreement.
3. Recenter stores history and restores previous filters on back.
4. Unavailable demo center preserves the old graph and explains why.
5. Comparison keeps at most two candidates with accessible removal.
6. Live rate limiting is actionable, not an empty result.
7. A live neighborhood rate limit offers the stored-snapshot escape hatch.
8. A failed recommendation branch is labeled partial, not empty.
9. Reading list survives reload and exports only saved papers as JSON.
10. Forced WebGL failure switches to 2D and keeps analysis usable.
11. Mobile layout has no horizontal overflow and keeps core actions reachable.
12. Reduced motion disables automatic rotation.
13. Keyboard-only search and result opening.
14. Keyboard-only filter, select, save, and recenter.
15. Stored snapshots are searchable and recenter through the linked real centers
    (Attention → Deep Reinforced → LSTM, then back twice).
16. An unstored snapshot paper preserves the graph and explains the limit.

## 4. Browser QA and visual evidence

All screenshots were captured at 1440×900 unless noted. The latest set is in
`qa/screenshots/`.

| Artifact | Verification |
|---|---|
| `desktop-3d.png` | Synthetic demo, 21 nodes, 3D sphere, legend, synchronized counts |
| `desktop-2d.png` | Same state in the real SVG radial view; 21 nodes |
| `desktop-list.png` | Same state in the accessible list; 20 rows |
| `snapshot-3d.png` | Stored real snapshot; 100 loaded nodes, 99 neighbors, 0 synthetic labels |
| `snapshot-data-info.png` | Provenance dialog: retrieval time, limits, branch coverage |
| `snapshot-recentered.png` | Real offline recenter to Deep Reinforced; URL and history preserved |
| `live-3d-full.png` | Complete live sample; 100 loaded nodes, 39 refs / 40 citing / 20 recs |
| `live-3d.png`, `live-2d.png`, `live-list.png`, `live-data-info.png` | Live mode with a transient missing branch, preserved as partial |
| `live-search.png` | Live search results and live-mode notice |
| `live-no-key-error.png` | Repeatable 429 response UI: explains missing server key and links to stored snapshots |
| `reading-list.png` | Saved paper persists on the reading-list page |
| `compare-panel.png` | Two-paper comparison, no quality verdict |
| `unavailable-recenter.png` | Catalog-only paper: old graph preserved, reason shown |
| `webgl-fallback.png` | Forced WebGL failure; warning plus usable 2D |
| `explorer-mobile.png` | 390×844 mobile default, 2D |
| `explorer-mobile-filters.png` | Mobile filter drawer |
| `desktop-200pct.png` | Effective 720×450 / 200% zoom approximation; no horizontal overflow |
| `qa/exports/snapshot-3d.png` | Exported canvas PNG, 802×407, 116,568 bytes |
| `qa/exports/snapshot-2d.svg` | Exported SVG, 338,864 bytes |

The older `explorer-desktop*.png` files are earlier QA captures and are not part
of the current evidence set.

### Manual checks

| Check | Result |
|---|---|
| Desktop 3D/2D/list all load the same center and branches | Pass |
| Legend, memberships, counts, and list agree | Pass |
| Filter reset restores demo 20 rows; filtered subset is 15 | Pass |
| Compare caps at two; removal is keyboard-accessible | Pass |
| Recenter keeps old graph until success; failure preserves it | Pass |
| Back navigation restores center and filters | Pass |
| Snapshot mode is visibly different from synthetic demo | Pass |
| Header search mode/notice follows the loaded mode | Pass |
| Reading list survives reload; JSON export contains only saved papers | Pass |
| PNG and SVG exports are valid files | Pass |
| Mobile 390×844 has no horizontal overflow; filter/detail drawers work | Pass |
| 200% zoom approximation has no horizontal page overflow | Pass (3D viewport is short; 2D/list recommended at this size) |
| Keyboard-only search, filter, select, save, recenter | Pass (E2E) |
| `Escape` closes Data info and returns focus to its trigger | Pass (`qa/accessibility-check.json`) |
| `Escape` closes mobile filters and returns focus to the toggle | Pass |
| Reduced motion disables auto-rotation | Pass |
| Forced WebGL failure keeps 2D analysis usable | Pass |
| Console errors during demo/snapshot/live/mobile QA | 0 |

### Contrast spot checks

Computed from the design tokens (not an automated axe run):

| Pair | Ratio |
|---|---:|
| Main text `#F3F5FA` on page `#0B1020` | 17.36:1 |
| Muted text `#B0BCD0` on panel `#121A2B` | 9.06:1 |
| Reference cyan `#5DD6F4` on panel | 10.25:1 |
| Citing amber `#F6BE5A` on panel | 10.29:1 |
| Recommendation violet `#B69CFF` on panel | 7.60:1 |
| Dark text `#07131E` on cyan button | 11.05:1 |

All checked pairs exceed WCAG AA for normal text. Color is not the only
membership channel: text badges and list labels are present throughout.

## 5. Performance

Measured with `qa/perf.mjs` in headless Chromium at 1440×900,
`deviceScaleFactor: 1`, after warm-up. These are local observations, not a
laboratory benchmark.

| Metric | Result |
|---|---|
| Synthetic demo, 21-node 3D drag | median **59.3 FPS** (samples 55.4, 60.0, 59.3) |
| Stored snapshot, 100-node 3D drag | median **60.0 FPS** (samples 60.0, 60.0, 59.3) |
| Filter click → coordinated chip/list DOM update | median **16.1 ms** (in-page samples 4.9–18.9 ms) |
| Demo direct load → heading visible | 1.5–1.8 s across runs |
| Navigation timing (cached local assets) | DOMContentLoaded 28 ms; load 75 ms |
| Live Semantic Scholar search API (historical, keyed) | 2037 ms |
| Live Semantic Scholar complete neighborhood API (historical, keyed) | 7062 ms |
| Live OpenAlex search API (Vercel production) | 1497 ms |
| Live OpenAlex 91-node neighborhood API (Vercel production) | 1155 ms |
| Live provider branch transient failure | observed; retry succeeded |

The renderer initially produced roughly 21 FPS for the 100-node snapshot in this
headless/software-WebGL environment. It was optimized without dropping nodes:
reduced sphere tessellation above 60 nodes, disabled antialiasing for large
scenes, switched large-scene nodes to Lambert materials, capped pixel ratio at
1.5, and removed `preserveDrawingBuffer` after verifying PNG export still works.
The optimized result is the table above. See `docs/DESIGN_RATIONALE.md` for the
tradeoff.

The 3D export remains a canvas PNG only. It renders the active frame immediately
before capture; the source image is not an editable scene.

## 6. Real-data verification

### Live OpenAlex — public deployment

Verified against `https://paper-orbit-live.vercel.app` on November 24, 2026.
OpenAlex is key-free, so the public deployment asks readers for no credential.

| Check | Result | Observed latency |
|---|---|---:|
| `/api/health` | 200; `liveConfigured: true`, `liveProvider: openalex`, `liveKeyConfigured: false` | — |
| Search “attention is all you need” | 200; 10 results; first is *Attention Is All You Need* (`W2626778328`) | 1497 ms |
| `ARXIV:1706.03762` | 200; resolved to `W2626778328` | — |
| `DOI:10.48550/arXiv.1706.03762` | 200; resolved to `W2626778328` | — |
| Live neighborhood around Attention | 200; 91 nodes, 80 edges; refs 40, citing 40, related 10; all branches `ok` | 1155 ms |
| Browser flow | Live selected; no key dialog; search result opened; 90 papers loaded; no console errors | — |
| Public access | Production URL returned HTML without a login redirect in curl and Playwright | — |

The same browser-side OpenAlex path is used by the static GitHub Pages mirror,
so Live remains available there without a key.

### Live Semantic Scholar — authenticated smoke check (historical)

Full details: `qa/live-verification.json`; raw unauthenticated 429 evidence:
`qa/s2-live-headers.txt`, `qa/s2-live-body.txt`.

| Check | Result | Latency |
|---|---|---:|
| Search “Attention Is All You Need” | 10 results; expected paper first | 2037 ms |
| `arXiv:1706.03762` | resolved to `204e3073870fae3d05bcbc2f6a8e263d9b72e776` | 1642 ms |
| arXiv URL | resolved via cache | 2 ms |
| DOI `10.1162/neco.1989.1.2.270` | resolved to `ce9a…48de` | 2150 ms |
| DOI URL | resolved via cache | 1 ms |
| Neighborhood around Attention | 100 nodes; refs 39, citing 40, recs 20, all `ok` | 7062 ms |
| Browser inspection | 99 visible; live badge; no warning; no console errors | — |

One earlier live neighborhood attempt had a failed references branch; the UI
showed an unavailable-branch warning and preserved the failure. A later attempt
completed all three branches. This variability is documented rather than hidden.
A DataCite DOI for the Attention paper (`10.48550/arXiv.1706.03762`) returned
`NOT_FOUND` from Semantic Scholar during an early probe; the app reports the
provider lookup failure and does not fabricate a paper. The arXiv ID and a
publisher DOI both resolved.

The authenticated key was supplied only through the server process environment.
It was not written to disk, not included in `.env.local`, not returned by an API,
and not present in the repository or production bundle. The credential-prefix scan found no matches in the source/docs/QA tree or the
production build; `.env.example` is the only env file.

**Rate-limit diagnosis.** A production server started without the environment
key reports `liveKeyConfigured: false` at `/api/health`; its live neighborhood
request returns `429` because it shares Semantic Scholar's unauthenticated
quota, which is intermittent (an earlier search and one later neighborhood did
succeed). With the server-side key loaded, the 100-node neighborhood completed.
The UI now distinguishes a missing key from a limited key and links directly to
stored snapshots. `/api/health` exposes only the boolean, never the key. The
`live-no-key-error.png` capture uses a repeatable mocked 429 response.

### Stored snapshots

Generated `2026-10-28T18:18:40.243Z`; manifest `schemaVersion: 1`; provider
`semantic-scholar`; 249 catalog entries.

| Center | Nodes | Neighbors | Refs | Citing | Recs | Notes |
|---|---:|---:|---:|---:|---:|---|
| Attention is All you Need | 100 | 99 | 39 | 40 | 20 | all branches `ok` |
| A Deep Reinforced Model for Abstractive Summarization | 98 | 97 | 40 | 40 | 20 | overlaps merged; all branches `ok` |
| A Learning Algorithm for Continually Running Fully Recurrent Neural Networks | 60 | 59 | 0 | 40 | 19 | references branch `error`; preserved, not shown as zero |

The first center includes the second as a reference; the second includes the
third. Both offline links were exercised in the E2E suite and browser QA.

Missingness in the snapshots is high and visible in the UI:

- 83/99 Attention neighbors lack abstracts.
- 86/97 Deep Reinforced neighbors lack abstracts.
- 58/59 LSTM neighbors lack abstracts.
- The LSTM sample has one unknown year; this stays an unknown bucket.

The app therefore exposes title-only/unavailable similarity coverage and avoids
imputing missing text. The failed references branch has status `error` with a
provider-shape message; it is not coerced to an empty branch.

### Synthetic demo

- 42 fictional papers; 3 neighborhoods; 42-entry catalog.
- Center 001: 21 nodes, 20 neighbors, 12 citation edges, 9 recommendations.
- Center 002: 16 nodes, 15 neighbors, 10 citation edges, 6 recommendations.
- Center 003: 17 nodes, 16 neighbors, 10 citation edges, 7 recommendations.
- `syn-paper-042` is catalog-only and appears in center 001 for unavailable
  recenter testing.
- Persistent synthetic labels appear in search results, explorer, details,
  provenance, and exports.
- No network request or credential is used in demo mode.

## 7. Accessibility and resilience observations

- Keyboard-only E2E paths passed for search, opening a result, filtering,
  selecting, saving, and recentering.
- Native modal dialog: focus entered on the close button, Escape closed it, and
  focus returned to the Data info trigger (`qa/accessibility-check.json`).
- Mobile filter drawer: Escape closed it (off-canvas) and focus returned to the
  Open filters toggle.
- Reduced motion: auto-rotation button is disabled with an explanatory title.
- WebGL failure: forced failure produced a warning and switched to a usable 2D
  view; all analytical controls remained.
- Mobile: `scrollWidth == clientWidth == 390`; no horizontal overflow.
- 200% zoom approximation: `scrollWidth == clientWidth == 720`; no page-level
  horizontal overflow. The 3D scene is vertically compressed at 720×450, so the
  2D/list views are the better reading mode at that effective size.
- The canvas carries a role/label/instructions and the list is the explicit
  accessible alternative. Hover is not required for any workflow.

No automated axe/Lighthouse audit was run. The contrast checks above are manual
token calculations, and the keyboard/focus evidence is the Playwright checks and
small focus script, not a formal WCAG conformance audit.

## 8. Known limitations and residual risks

1. **No user study.** All claims about task support and 3D-versus-2D usefulness are
   design arguments pending the study in `docs/EVALUATION_PLAN.md`.
2. **Snapshot licensing/public display.** The Semantic Scholar API license limits
   use and requires public displays to point back with `utm_source=api` and the
   official name/logo. The app includes the name/link but does not bundle an
   official logo. Stored abstracts should be reviewed before public
   redistribution. See `docs/DATA_SOURCES.md`.
3. **Bounded samples.** Three real neighborhoods are not a complete citation
   index; provider totals and loaded neighbor counts are intentionally separate.
4. **Missing abstracts.** Most real neighbors are title-only or similarity-
   unavailable. This limits local text similarity and is surfaced in the UI.
5. **Live variability.** OpenAlex public rate limits and transient upstream
   errors can produce partial branches; the optional keyed Semantic Scholar
   provider has a much tighter limit. The app preserves partial data and the
   snapshot mode is the reliable demo path.
6. **Third snapshot branch failure.** The LSTM references branch is an observed
   acquisition failure, not a zero-reference result. This is deliberate evidence
   but may confuse a viewer who skips provenance.
7. **3D performance.** The local headless result meets the target after
   optimization, but software-WebGL environments vary. The list/2D views remain
   complete alternatives.
8. **Low dev-only audit advisory.** `esbuild` is pinned through `tsx`/Vite; the
   advisory affects the esbuild development server on Windows, not this production
   runtime. No automatic dependency upgrade was made during final QA.
9. **No clean-install lockfile drift.** `npm ci` used the committed lockfile. The
   build and tests passed on the resulting tree.

## 9. Reproduce the evidence

```bash
cd /Users/ssethi/Documents/build/paper-orbit
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser/perf scripts require a running production server:

```bash
npm run start -- --hostname 127.0.0.1 --port 3100
node qa/final-qa.mjs       # demo/snapshot; live section needs a configured key
node qa/perf.mjs
```

The live verification is opt-in and consumes provider quota:

```bash
SEMANTIC_SCHOLAR_API_KEY=... ENABLE_LIVE_API=true \
  npm run start -- --hostname 127.0.0.1 --port 3100
node qa/live-verify.mjs
```

Do not commit the key or a transcript containing it. The live script writes only
normalized summaries and no request headers.

## 10. Evidence index

| Path | Contents |
|---|---|
| `qa/npm-ci-final.txt` | clean install |
| `qa/npm-audit.json` | audit details |
| `qa/lint-final.txt` | lint pass |
| `qa/typecheck-final.txt` | TypeScript pass |
| `qa/unit-final.txt` | 13 files / 100 tests |
| `qa/build-final.txt` | production build |
| `qa/e2e-run-final.txt` | 16/16 Playwright |
| `qa/final-qa.json` | browser checks, counts, console errors |
| `qa/final-qa.mjs` | reproducible browser QA script |
| `qa/perf.json`, `qa/perf.mjs` | FPS and filter timing |
| `qa/accessibility-check.json` | dialog/drawer focus return |
| `qa/live-verification.json` | live search/resolution/neighborhood |
| `qa/live-verify.mjs` | live verification script |
| `qa/s2-live-headers.txt`, `qa/s2-live-body.txt` | unauthenticated 429 observation |
| `qa/screenshots/` | screenshots listed in §4 |
| `qa/exports/` | PNG/SVG export samples |
| `docs/EVALUATION_PLAN.md` | unexecuted study plan and blank templates |
| `docs/DATA_SOURCES.md` | source, normalization, licensing, missingness |
| `docs/DESIGN_RATIONALE.md` | design decisions and tradeoffs |
| `docs/DELIVERABLE_1_DRAFT.md`, `docs/DELIVERABLE_2_DRAFT.md` | course drafts |
| `docs/DEMO_SCRIPT.md` | reproducible 3–7 minute demo |

## 11. Sign-off

The application is complete for the local course prototype: clean install,
production build, lint/typecheck, 100 unit/component tests, 16 end-to-end tests,
desktop/mobile/keyboard/reduced-motion/WebGL-fallback QA, three real stored
neighborhoods, real live-provider verification, and documented limitations. The
only intentionally outstanding items are the unexecuted user study and the
public-display/licensing review required before redistributing Semantic Scholar
data or deploying publicly.
