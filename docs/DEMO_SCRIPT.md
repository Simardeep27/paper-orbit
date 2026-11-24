# Demo script

A target **5-minute** live demonstration using the stored real snapshots. A
3-minute cut and a 6–7 minute extended walkthrough are also included. The
snapshot mode is chosen deliberately: it is reproducible without a key or network
and still shows real Semantic Scholar metadata, bounded sampling, and an actual
failed branch. The 5-minute timing below matches the course-demo beats.

## Preflight (5 minutes before)

```bash
cd /Users/ssethi/Documents/build/paper-orbit
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

Open `http://127.0.0.1:3100` and check:

- `/api/health` returns `ok: true` and `demoAvailable: true`,
  `snapshotAvailable: true`.
- The snapshot URL below loads 100 nodes.
- Browser zoom is 100%, sound is on if recording, and notifications are off.
- No API key is needed for this script. Do not show `.env.local`, shell history,
  request headers, or the terminal while it contains a credential.
- If a live demonstration is requested, do it after the snapshot walkthrough and
  expect rate limits/partial branches. The snapshot is the reliable story.

**Seed URL:**

```text
http://127.0.0.1:3100/explore?center=204e3073870fae3d05bcbc2f6a8e263d9b72e776&mode=snapshot
```

## 5-minute demo

| Time | Do | Say |
|---|---|---|
| 0:00–1:00 | Landing page; open snapshot seed | “One paper is a doorway. Paper Orbit opens a bounded neighborhood of references, citing papers, and recommendations. This is stored real Semantic Scholar metadata: 100 loaded nodes, a sample — not the complete citation graph.” |
| 1:00–1:45 | Orbit; select a cyan reference, then an amber citing paper | “Solid arrows are observed citations, and direction matters: references point out, citing papers point in. Cyan/amber/violet are separate memberships. Recommendations are dashed associations, not citations. Angle is arrangement only.” |
| 1:45–2:30 | Filter the 40 citing papers by year; inspect histogram and list | “The histogram keeps context while highlighting the range. Unknown years stay separate. The list and graph use the same filter state; no API request is made.” |
| 2:30–3:15 | Open a candidate; compare two; save one | “Recommendations are candidates, not a similarity magnitude. Local text similarity is TF-IDF and title-only or unavailable when abstracts are missing. Comparison caps at two and does not declare a winner. Save to the local reading list.” |
| 3:15–4:00 | Recenter to A Deep Reinforced Model; use history back | “Recenter is explicit and atomic. The old graph remains until the new bounded sample arrives, stale responses cannot win, and history restores the previous context.” |
| 4:00–4:30 | Switch to 2D; explain the tradeoff | “3D is the overview; 2D SVG and the list are the precise, accessible views. Perspective and occlusion are why exact comparison never lives only in 3D.” |
| 4:30–5:00 | Data info; close with limitations | “Retrieval time, branch limits, received/distinct counts, missing abstracts, and preserved failures are in Data info. No user study has been run; the synthetic demo is fictional and labelled. Real snapshots are bounded samples.” |

## 3-minute cut

| Time | Do | Say |
|---|---|---|
| 0:00 | Landing page | “One paper is a doorway, not a search result. Paper Orbit opens a bounded neighborhood around it.” |
| 0:20 | Open snapshot seed | “This is stored real Semantic Scholar metadata: 100 loaded nodes — the center plus 99 neighbors. It is a sample, not the complete citation graph.” |
| 0:45 | Orbit 3D; select one reference and one citing node | “Cyan references point outward from the center. Amber citing papers point in. Violet recommendations are dashed associations, not citations.” |
| 1:20 | List view; highlight memberships | “Every visual channel has exact metadata in the list: year, venue, authors, citation count, and membership.” |
| 1:45 | Data info | “The provenance panel shows the retrieval date, branch limits, received/distinct counts, missing abstracts, and the failed branch in the third snapshot. Failure is not an empty list.” |
| 2:10 | Compare two; save one | “Two candidates, side by side. Save one to the local reading list; no account or database.” |
| 2:30 | Recenter A Deep Reinforced; back | “Recenter is explicit. The graph stays until the new one arrives. History brings me back with the old context.” |
| 2:50 | Close | “3D for overview, 2D/list for precision. Synthetic demo for tests; real snapshots for review; live mode when credentials and rate limits permit.” |

## Full script

### 0:00–0:30 — Frame the problem

Open `http://127.0.0.1:3100`.

> “A literature search usually gives you a flat list. Paper Orbit starts from one
> known paper and asks: what does it reference, who cites it, and what nearby work
> might I read next? The important design word is *bounded*: this is a sample of a
> neighborhood, not a map of a field.”

Point at the three mode buttons on the landing page.

> “There are three explicit modes. Synthetic demo is fictional and labelled.
> Stored snapshot is real provider metadata captured at a point in time. Live
> provider calls Semantic Scholar now, subject to rate limits. They are never mixed
> silently.”

### 0:30–1:20 — Load and orient

Click **Snapshot**, search `Attention Is All You Need`, and open the result. If
the search is slow, use the seed URL above.

> “The center is fixed. The status chip says 99 visible of 99 loaded neighbors;
> the center is not counted as a neighbor. The branch summary says 39 references,
> 40 citing papers, and 20 recommendations.”

Drag the sphere slowly. Select a cyan reference node, then an amber citing node.

> “A solid arrow means an observed citation. Direction matters: references point
> from the center out; citing papers point into the center. A dashed violet link
> is a provider recommendation — a candidate association, not a citation. The
> angle around the sphere is arrangement only; it does not encode topic or
> similarity.”

Select the center and open details if needed.

> “Node size is log-scaled provider citation count. It is metadata, not a quality
> score. Hollow nodes mean the citation count is unknown; a known zero is
> different.”

### 1:20–2:10 — Filters, list, and histogram

Switch to **List**. Point out the membership badges and the text-similarity
coverage.

> “The list is not a fallback screenshot. It is the precise surface. Each row has
> the same memberships, the exact year/venue/citation count, local similarity when
> available, and save/compare actions.”

Uncheck **Recommendations** in the filter rail.

> “The count drops from 99 to 79 because 20 candidates are recommendations. The
> graph, list, counts, and histogram all use the same derived state. Filters are
> local; they do not make another API request or rescore papers.”

Restore the recommendation filter. Brush a small year interval and then use the
numeric year inputs.

> “The histogram keeps its context while highlighting the range. Unknown years
> are a separate bucket, not forced into an early or late year.”

Open a paper with missing abstract.

> “Many provider records lack abstracts — 83 of these 99 neighbors do. The details
> panel says unavailable, and similarity falls back to title-only or unavailable.
> We do not generate an abstract.”

### 2:10–2:50 — Provenance

Open **Data info**.

> “This is the honesty layer: mode, provider, retrieval timestamp,
> recommendation pool, requested limits, branch status, received versus distinct,
> skipped entries, next offsets, missing years/counts/abstracts, and the local
> similarity method.”

Point at the LSTM snapshot's failed references branch if showing all three
snapshots.

> “This branch is `error`, not zero. A failed request is preserved as a failure.
> The old graph stays usable and the app never turns a provider error into an
> empty citation list.”

### 2:50–3:50 — Compare and save

Select a reference, then a citing paper. Use the compare action on each row.

> “Comparison is capped at two. It compares exact metadata and memberships. It
> does not declare a winner and it does not reuse a similarity score computed
> against a different center.”

Save one paper. Open **Reading list**.

> “The reading list is local `localStorage`. It survives reload and exports only
> the saved papers as JSON or Markdown. No account, database, or cloud.”

Reload the reading-list page to demonstrate persistence. Return to the explorer.

### 3:50–4:50 — Recenter and history

Switch to **List** if needed. Find **A Deep Reinforced Model for Abstractive
Summarization**, select it, and click **Make central paper**.

> “Recenter is explicit. The old graph stays visible while the new bounded sample
> loads. A generation token prevents an older response from overwriting a newer
> center. On success, center-specific filters reset and history records the old
> context.”

Wait for 98 nodes, then find **A Learning Algorithm for Continually Running Fully
Recurrent Neural Networks** and recenter again.

> “These are real stored centers, linked by observed references. The LSTM
> snapshot preserves a failed references branch from acquisition.”

Use history **Back** twice to return to Deep Reinforced and Attention.

> “Back restores the previous center and filters from local history/cache; it does
> not fabricate a new neighborhood. If a paper has no stored neighborhood, the old
> graph stays and the UI says why.”

Optional: in the synthetic demo, open **A Notebook of Unpublished Reading Notes**
and attempt recenter to show the unavailable path.

### 4:50–5:40 — 3D vs 2D/list, fallback, mobile

Switch to **2D** and point out that it is a real SVG renderer with the same nodes,
edges, filters, and selection.

> “The 3D sphere is for overview. The 2D radial view and list are the precise,
> accessible alternatives. Perspective and occlusion are why we do not put exact
> comparison only in 3D.”

Open `http://127.0.0.1:3100/explore?center=syn-paper-001&mode=demo&forceWebgl=0`.

> “If WebGL fails, the app switches to 2D, shows a warning, and keeps filtering,
> selection, saving, and recenter available. It does not leave a blank canvas.”

Resize to 390 px or open a mobile viewport.

> “On mobile the core view defaults to 2D, filters become a drawer, and details
> become a sheet. There is no horizontal page overflow.”

### 5:40–6:30 — Close with limitations

> “What this is not: a complete citation index, a quality ranking, a semantic map,
> an LLM summary, or a user study result. Citation counts are biased, abstracts
> are missing, recommendations are bounded candidates, and live access is rate
> limited. The stored snapshots are real metadata but still samples, and the third
> one intentionally preserves a failure. The synthetic demo is fictional and
> labelled everywhere. The evaluation plan is precommitted and not yet run.”

Optional final slide/README: point to `docs/QA_REPORT.md` for exact test counts,
performance, screenshots, and limitations.

## Exact URLs

| Purpose | URL |
|---|---|
| Snapshot seed | `/explore?center=204e3073870fae3d05bcbc2f6a8e263d9b72e776&mode=snapshot` |
| Snapshot second center | `/explore?center=032274e57f7d8b456bd255fe76b909b2c1d7458e&mode=snapshot` |
| Snapshot third center | `/explore?center=ce9a21b93ba29d4145a8ef6bf401e77f261848de&mode=snapshot` |
| Synthetic demo | `/explore?center=syn-paper-001&mode=demo` |
| Forced WebGL failure | `/explore?center=syn-paper-001&mode=demo&forceWebgl=0` |
| Data sources / limitations | `/about` |

## Q&A notes

- **“Is this live?”** Point at the mode badge. Snapshot means stored real data;
  live means a current provider call; synthetic means fictional.
- **“Are these all the citations?”** No. Read the branch limits and received
  counts in Data info. The list is bounded.
- **“What does the radius mean?”** Local TF-IDF similarity to the center in the
  similarity-radius layout; angle means nothing. Switch to Even shell to remove
  the radius encoding.
- **“Why is 3D necessary?”** It is the overview/identity and a spatial anchor;
  exact work happens in 2D/list. We do not claim 3D is better without a study.
- **“Where is the AI?”** There is no remote LLM or generated text. Similarity is
  deterministic TF-IDF; provider recommendations are labelled as candidates.
- **“Can I publish this?”** Review the Semantic Scholar license, add the required
  official name/logo treatment, and confirm snapshot/abstract redistribution.
  The current app is a local course prototype.
- **“Live mode failed.”** Use the snapshot. The app preserves partial branches and
  explains errors; it does not invent data.
