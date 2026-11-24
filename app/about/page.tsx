import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Database,
  ExternalLink,
  FlaskConical,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Data sources & limitations",
  description:
    "How Paper Orbit retrieves, samples, scores, and labels research-paper data, including stored real-data snapshots and its synthetic demo.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader searchMode="either" />
      <main id="main" className="doc-page">
        <p className="eyebrow">Data provenance</p>
        <h1>What is in the orbit — and what is not.</h1>
        <p className="doc-lede">
          Paper Orbit visualizes a bounded sample around one paper. It is an
          exploration aid, not a complete citation index, a measure of research
          quality, or a semantic map of a field.
        </p>

        <div className="callout">
          <strong>The synthetic demo is fictional; the stored snapshots are real.</strong>
          <p>
            Every paper, author, venue, citation count, citation edge, and
            recommendation in the synthetic demo is fictional and deterministic.
            It exists so the workflow can be demonstrated without credentials or
            network access and must not be cited as real research data. The
            separate snapshot mode contains bounded, timestamped samples captured
            from Semantic Scholar; it is real provider metadata but still not a
            complete citation graph.
          </p>
        </div>

        <div className="prose">
          <h2>Three explicit data modes</h2>
          <div className="about-mode-grid">
            <section className="about-mode-card">
              <div className="about-mode-icon">
                <Database size={18} aria-hidden="true" />
              </div>
              <h3>Live provider mode</h3>
              <p>
                Server-side routes query the Semantic Scholar Academic Graph API
                and Recommendations API. The browser never receives an API key.
                Results depend on network access, provider availability, and the
                rate limit assigned to the configured key.
              </p>
              <ul>
                <li>Search: title or keyword query</li>
                <li>Resolve: DOI, arXiv ID, or their URLs</li>
                <li>Up to 40 references and 40 citing papers</li>
                <li>Up to 20 recommendations from the all-cs pool</li>
                <li>At most 101 nodes including the center</li>
              </ul>
              <p className="about-mode-link">
                <a
                  href="https://api.semanticscholar.org/api-docs/graphs"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Semantic Scholar API documentation
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </p>
            </section>

            <section className="about-mode-card">
              <div className="about-mode-icon">
                <Archive size={18} aria-hidden="true" />
              </div>
              <h3>Stored snapshot mode</h3>
              <p>
                Three bounded neighborhoods captured from Semantic Scholar are
                stored in the repository for reliable review without network
                access. They contain real provider metadata and observed
                citation directions, not synthetic records.
              </p>
              <ul>
                <li>Real titles, authors, years, and citation counts</li>
                <li>Up to 40 references, 40 citing papers, 20 recommendations</li>
                <li>Two centers are linked for offline recenter and history</li>
                <li>Branch failures are preserved as partial samples</li>
              </ul>
              <p className="about-mode-link">
                <Link href="/explore?mode=snapshot">
                  Browse the stored snapshots
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </p>
            </section>

            <section className="about-mode-card">
              <div className="about-mode-icon about-mode-icon-demo">
                <FlaskConical size={18} aria-hidden="true" />
              </div>
              <h3>Synthetic demo mode</h3>
              <p>
                The demo uses a hand-authored catalog of 42 fictional papers and
                three stored neighborhoods. Two of those neighborhoods are
                linked, so recentering and history can be exercised offline. The
                third is available for a different center shape. This mode is
                always visually labeled and is never mixed with live results.
              </p>
              <ul>
                <li>Fictional titles and authors, visibly labeled</li>
                <li>Deterministic citation directions and scores</li>
                <li>Some centers have no stored neighborhood on purpose</li>
                <li>No network request is made in demo mode</li>
              </ul>
              <p className="about-mode-link">
                <Link href="/explore?center=syn-paper-001&mode=demo">
                  Open the synthetic demo
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </p>
            </section>
          </div>

          <h2>What “nearby” means</h2>
          <p>
            A paper can appear in this app for three different reasons, and the
            interface keeps them separate:
          </p>
          <ul>
            <li>
              <strong>Reference</strong> — a directed citation observed in the
              center paper&apos;s reference list. The center cites it.
            </li>
            <li>
              <strong>Citing</strong> — a directed citation observed in the
              center paper&apos;s citation list. It cites the center.
            </li>
            <li>
              <strong>Recommended</strong> — a candidate returned by the
              provider recommendation endpoint. Rank is ordering, not a quality
              judgment, and a recommendation is never drawn as a citation.
            </li>
          </ul>
          <p>
            Local <strong>text similarity</strong> is a fourth, separate signal.
            It is a TF-IDF cosine score computed in the browser or during fixture
            generation from titles and available abstracts in the loaded
            neighborhood only. Titles are repeated twice to give them modest
            extra weight, common English stopwords are removed, and vectors are
            L2-normalized. Missing abstracts produce a “title only” coverage
            label; empty text produces no score rather than an invented value.
          </p>
          <p className="prose-callout">
            {`"Based on overlapping words in available titles and abstracts within this loaded neighborhood. It can miss conceptual similarity."`}
          </p>
          <p>
            Scores are not comparable across different centers or differently
            sized samples, and they are not percentages or provider metrics.
            Filters never recompute scores or move nodes.
          </p>

          <h2>Sampling, missing values, and failure states</h2>
          <p>
            Citation branches are requested independently. A branch that fails
            is marked failed or unavailable — never presented as “no citations.”
            An empty successful branch is shown as empty. Raw entries, valid
            distinct papers, skipped records, and the next offset are available
            in the data-info panel for every neighborhood.
          </p>
          <p>
            Unknown years, citation counts, and abstracts stay unknown. A known
            zero is shown as zero. Citation arrows point from the citing paper to
            the cited paper, and edges between two peripheral papers are not
            invented. The graph is an ego-neighborhood, not an induced citation
            graph.
          </p>

          <h2>Scores, ranking, and bias</h2>
          <p>
            Citation counts are broad indexed counts, not visible-degree counts
            and not quality ratings. Older papers have had more time to
            accumulate citations, and provider coverage varies by field. The
            graph uses a frozen log scale for node size, so filtering does not
            silently rescale the encoding.
          </p>
          <p>
            Sorting applies only to the currently loaded sample. “Recommendation
            rank” is available only for recommended papers and is never used as
            a fallback text score.
          </p>

          <h2>Reliability and privacy</h2>
          <ul>
            <li>
              Upstream requests are serialized in one process, starting no more
              than once every 1.1 seconds by default, with an 8-second timeout.
            </li>
            <li>
              Successful search responses are cached for 10 minutes and
              metadata/neighborhood responses for 24 hours in a bounded
              in-memory cache. This is a single-process design; multiple server
              instances would need shared infrastructure.
            </li>
            <li>
              Your reading list, notes, and preferences stay in this
              browser&apos;s local storage. No account, analytics service, remote
              LLM, or embedding API is used.
            </li>
            <li>
              Exports contain only saved papers and provenance. API keys, raw
              headers, and unrelated browser storage are never included.
            </li>
          </ul>

          <h2>Known limitations</h2>
          <ul>
            <li>The graph covers a bounded sample, not a complete field.</li>
            <li>
              Recommendation availability varies, and recommendations are not
              scored semantic matches.
            </li>
            <li>
              TF-IDF misses synonymy, negation, and conceptual relationships; it
              is intentionally simple and reproducible.
            </li>
            <li>
              No full-text PDFs, citation intent, topic clustering, or automatic
              summaries are produced.
            </li>
            <li>
              Mobile supports the 2D and list workflows fully; 3D is best
              experienced on a larger screen.
            </li>
            <li>
              Live provider access was verified on October 28, 2026 with a
              server-side API key. Unauthenticated access was rate limited
              (HTTP 429) during this build. The stored snapshots and synthetic
              demo require neither network access nor credentials.
            </li>
          </ul>

          <div className="about-attribution">
            <div>
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <strong>Provider attribution</strong>
                <p>
                  Live metadata is retrieved from Semantic Scholar. Use of the
                  API is subject to the provider&apos;s license and attribution
                  requirements.
                </p>
              </div>
            </div>
            <a
              href="https://www.semanticscholar.org/?utm_source=api"
              target="_blank"
              rel="noreferrer noopener"
            >
              Semantic Scholar
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>

          <div className="about-actions">
            <Link href="/explore?mode=snapshot" className="btn btn-primary">
              <Archive size={15} aria-hidden="true" />
              Browse stored snapshots
            </Link>
            <Link href="/explore?center=syn-paper-001&mode=demo" className="btn">
              <Sparkles size={15} aria-hidden="true" />
              Try the synthetic demo
            </Link>
            <Link href="/" className="btn">
              Back to search
            </Link>
            <Link href="/reading-list" className="btn btn-ghost">
              <Gauge size={14} aria-hidden="true" />
              Reading list
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
