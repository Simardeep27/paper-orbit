# Evaluation plan

> **Status: not executed.** This is a precommitted evaluation plan. No
> participant counts, times, satisfaction ratings, or usability findings are
> reported here. Engineering and browser QA results are in `QA_REPORT.md`.

## 1. Purpose and research questions

The study asks whether Paper Orbit helps a reader turn one known paper into an
inspectable, useful reading neighborhood without overstating what the data shows.

**RQ1 — Neighborhood comprehension.** Can participants identify the central
paper's references, citing papers, and recommendations, and explain the
difference between an observed citation and a provider recommendation?

**RQ2 — Task support.** Can participants find a relevant candidate, inspect exact
metadata, compare two candidates, and follow a reading path with recenter and
history?

**RQ3 — View differences.** How do the 3D sphere and the 2D/list views compare for
orientation, lookup, filtering, and precise comparison? This is exploratory; the
study is not powered to declare one universally better.

**RQ4 — Provenance and trust.** Do participants notice bounded sampling, missing
metadata, failed branches, and synthetic-data labels, and can they explain what
the interface does and does not cover?

## 2. Design

- **Format:** moderated, within-subjects formative usability study.
- **Sample:** 5–8 graduate students or researchers who have done a literature
  search; recruit 5–8 to allow for no-shows. This is a course-scale convenience
  sample, not a representative survey.
- **Session length:** approximately 50–60 minutes.
- **Conditions:** the same stored snapshot neighborhoods under two view orders.
  - **Order A:** 3D first, then 2D/list.
  - **Order B:** 2D/list first, then 3D.
  - Counterbalance order across participants. Use the same seed centers, task
    wording, and data in both conditions.
- **Data:** stored real snapshots for controlled tasks; optional live-mode
  demonstration only after the timed tasks, so provider rate limits do not
  contaminate comparisons.
- **Session mode:** think-aloud while working, followed by a short semi-structured
  interview and the System Usability Scale (SUS).
- **No deception.** Explain that the interface is a student prototype, that some
  data is stored from Semantic Scholar, that the synthetic demo is fictional, and
  that the study evaluates the interface rather than the participant.

## 3. Participants and ethics

### Inclusion

- Adult (18+) graduate student, researcher, or advanced undergraduate.
- Has searched for academic papers in the last six months.
- Comfortable reading English paper metadata.

### Exclusion

- Anyone who worked on the Paper Orbit implementation or has seen the task
  answers.
- Anyone who does not consent to screen/audio recording.

### Consent and privacy

- Obtain written or recorded verbal consent before starting.
- Record screen and audio only with separate permission; allow notes-only
  participation.
- Do not collect API keys, passwords, email contents, or unpublished research.
- Use pseudonymous participant IDs (`P01`, `P02`, …) in notes.
- Store recordings and consent forms outside the repository in an access-
  controlled course folder; do not commit study data.
- Participants may skip a task or withdraw at any time; delete their recording on
  request.
- Do not use live-provider credentials in a participant session. Use the stored
  snapshot mode.
- Debrief that the synthetic demo is fictional and that the study is formative.

## 4. Materials

- Running production build at `http://127.0.0.1:3100`.
- Stored snapshot center URLs:
  - `Attention is All you Need` — `204e3073870fae3d05bcbc2f6a8e263d9b72e776`
  - `A Deep Reinforced Model for Abstractive Summarization` —
    `032274e57f7d8b456bd255fe76b909b2c1d7458e`
  - `A Learning Algorithm for Continually Running Fully Recurrent Neural
    Networks` — `ce9a21b93ba29d4145a8ef6bf401e77f261848de`
- Task sheet with seed URLs and neutral prompts.
- Ground-truth answer sheet generated from the snapshot files (paper IDs,
  memberships, stored branch coverage, retrieval timestamps).
- Timer, observation sheet, SUS form, interview guide.
- Screen/audio recording software with participant permission.
- Optional: 2D and 3D help text printed so instructions do not reveal answers.

## 5. Procedure

1. **Welcome and consent (5 min).** Explain purpose, recording, voluntary
   participation, and the difference between real snapshots and the synthetic
   demo.
2. **Background (3 min).** Field, year in program, frequency of literature
   searches, familiarity with citation indexes and 3D interfaces. Do not collect
   unnecessary demographic data.
3. **Warm-up (3 min).** Open the landing page. Ask the participant to identify the
   three data modes and open the stored snapshot mode. No scored data.
4. **Condition A tasks (15 min).** Think-aloud tasks with the first assigned view.
   The moderator reads prompts neutrally and does not point at controls unless the
   participant is blocked for 60 seconds.
5. **Short break and condition switch (2 min).** Reset to the seed URL and filters.
6. **Condition B tasks (15 min).** Same task types with the other view order. Use
   parallel but not identical candidate choices to reduce memory effects; record
   the exact seed and candidate IDs.
7. **SUS and interview (10 min).** Administer SUS, then ask about strategy,
   confusion, trust, missing data, and what they would change.
8. **Debrief and close (2 min).** Answer questions, explain limitations, thank the
   participant.

The moderator should not describe the intended answer, recommend a candidate, or
defend the design during timed tasks. If a participant asks whether a branch is
complete, prompt them to use the interface's provenance information.

## 6. Tasks

Use one condition order per participant. Record the exact URLs and paper IDs
handled. Tasks are intentionally about reading decisions, not visual recall.

### T0 — Orientation (warm-up, unscored)

- Open the Attention snapshot.
- Name the center paper.
- Find the reference, citing, and recommendation counts.
- Open Data info and state the retrieval date and one limitation of the sample.

**Success:** correctly names the center and distinguishes a bounded sample from a
complete citation graph.

### T1 — Reference lookup under a constraint

- Find a reference that fits a moderator-specified constraint (for example, a
  specified year interval or a named author/venue).
- State the paper ID/title and explain why it is a reference rather than a citing
  paper.

**Success:** correct paper, correct direction/membership, and evidence from the
interface. **Error:** chooses an inbound citing paper or a recommendation.

### T2 — Citing-paper and temporal scan

- Sort/filter the citing papers to a small year interval chosen from the actual
  histogram so at least two candidates remain.
- Identify the oldest or newest candidate in that interval and read its venue.
- Explain whether the displayed list is the complete set of all citations.

**Success:** correct candidate, correct temporal ordering, and says the list is a
bounded sample rather than all citations.

### T3 — Candidate comparison and saving

- Add two candidates with different memberships to comparison.
- Compare year, venue, citation count, membership, text-similarity coverage, and
  abstract availability.
- Save one to the reading list and locate it on the reading-list page.
- Add a third candidate and confirm the comparison cap behaves as explained.

**Success:** comparison contains at most two, metadata is read correctly, the
saved paper persists after reload, and the participant does not treat citation
count as a quality score.

### T4 — Follow a reading path

- Recenter on the linked Deep Reinforced paper.
- From that center, recenter on the LSTM paper.
- Use history to return to Deep Reinforced and then to Attention.
- State whether the previous filters/selection were preserved or intentionally
  reset, using the interface's own labels.

**Success:** correct sequence, no stale graph from the wrong center, and a correct
description of history behavior.

### T5 — Failure and provenance

- Return to the Attention snapshot and open a candidate that has no stored
  neighborhood in the synthetic demo (or a catalog-only paper in the demo).
- Attempt recenter and explain what happened.
- Open Data info and find the failed references branch in the LSTM snapshot.
- Explain the difference between a failed branch, an empty branch, and missing
  abstract/year metadata.

**Success:** says the old graph is preserved, does not claim there are zero
references, and distinguishes provider failure from unknown metadata.

### Optional T6 — 200% zoom / no-mouse check

- Complete a shortened search, select, save, and close-dialog sequence with the
  keyboard only, then repeat at an effective 200% zoom approximation
  (720×450 CSS viewport).
- Nothing is scored for speed; note any content clipped, unreachable, or
  horizontally scrolling.

## 7. Measures

### Behavioral

- Completion: `complete`, `partial`, `not complete` per task.
- Time on task from prompt end to the participant's final answer.
- Errors: wrong relationship direction, wrong candidate, stale center,
  unsupported completeness claim.
- Assistance: number and type of moderator hints.
- Control discovery: first control used, wrong turns, and recovery.
- View use: time/actions in 3D, 2D, list, histogram, details, comparison.
- Provenance use: whether Data info was opened before answering a coverage or
  trust question.

### Self-report

- SUS score (0–100 after the standard scoring procedure).
- Five-point Likert items on:
  - understanding the center/neighbor relationships,
  - confidence in finding a relevant paper,
  - ability to compare candidates,
  - trust in data provenance,
  - perceived mental effort.
- Semi-structured interview themes: orientation strategy, occlusion, filter
  confusion, trust, missing data, mobile/zoom, and desired features.

### Qualitative observation template

| Field | Notes |
|---|---|
| Participant ID | `P__` |
| Order | `3D-first` / `2D-first` |
| Task ID | `T1`–`T6` |
| Start / end | |
| Completion | `complete` / `partial` / `not` |
| Final answer | |
| Hints | count and text |
| Errors / recovery | |
| View(s) used | |
| Notable quote | |
| Observer interpretation | separate from quote |

Do not record names, email addresses, or the API key in the observation sheet.

## 8. Analysis plan

- Report per-participant and aggregate completion/error/time descriptively. Do not
  report inferential significance with this sample size.
- For view order, compare paired task times and error counts descriptively; note
  order and learning effects.
- Compute SUS per participant and report median/range; do not treat it as a
  validated measure of learning.
- Code interview notes with a simple thematic matrix (orientation, comparison,
  filters, provenance, trust, missing data, accessibility, desired changes).
- Separate observations from interpretations. Preserve contradictory or negative
  findings; do not average them away.
- Link every reported claim to a task record or quote, and report the number of
  participants contributing to each theme.
- If a task is ambiguous, revise the task sheet and mark the session; do not
  retroactively change success criteria.

## 9. Pilot and success criteria

Run one pilot with a labmate not in the main sample. Check that:

- the production build starts without a network connection for snapshot tasks;
- all seed URLs load and the expected candidate IDs exist;
- tasks fit the time boxes;
- the moderator can score answers from the ground-truth sheet;
- the 2D/list condition is genuinely equivalent for the same content;
- recording and consent language are clear.

The prototype is considered ready for the formative study if:

- no task requires the live provider or a credential;
- no known data-loss or stale-response defect appears in the pilot;
- every core task can be completed with the keyboard and with 2D/list;
- the moderator can distinguish a failed branch from an empty branch from the
  interface alone.

These are study-readiness criteria, not usability success claims.

## 10. Threats to validity and limitations

- Small convenience sample; no statistical generalization.
- Within-subject order effects and unequal practice with the data.
- The moderator may inadvertently cue 3D affordances.
- Participants may remember candidate answers from the first condition.
- Citation metadata is biased and incomplete; tasks test interaction, not
  research importance.
- The 3D renderer uses software WebGL in some automated environments; performance
  perception may differ on participants' hardware.
- Snapshot data are bounded samples; results should not be generalized to a
  complete citation index.
- The synthetic demo is fictional and must remain outside scored real-data tasks.
- This plan has not been executed; no participant or usability result is claimed.

## 11. Artifacts to archive after a real study

- Approved consent forms (outside the repo).
- Pseudonymous observation sheets and task timings.
- SUS forms and scoring sheet.
- Interview notes or transcripts with identifiers removed.
- Ground-truth snapshot version and retrieval timestamps.
- Analysis matrix and negative/contradictory findings.
- A short methods/results addendum that distinguishes observations from
  interpretations.
