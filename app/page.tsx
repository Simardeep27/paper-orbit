import Link from "next/link";
import {
  ArrowRight,
  Database,
  Layers3,
  Orbit,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchBox } from "@/components/SearchBox";
import { OrbitArt } from "@/components/OrbitArt";
import { SiteFooter } from "@/components/SiteFooter";

const DEMO_HREF = "/explore?center=syn-paper-001&mode=demo";

export default function HomePage() {
  return (
    <>
      <SiteHeader showSearch={false} dataHref="/about" />
      <main id="main" className="landing">
        <section className="hero">
          <div>
            <p className="eyebrow">Research neighborhood explorer</p>
            <h1>
              See the conversation{" "}
              <span className="hero-accent">around a paper.</span>
            </h1>
            <p className="hero-tagline">
              Paper Orbit turns one known paper into a bounded, inspectable
              neighborhood of references, citing work, and recommendations.
            </p>
            <p className="hero-description">
              Start from a title, DOI, or arXiv ID. Inspect exact metadata in a
              synchronized list, compare candidates, and follow the thread
              without losing your way back.
            </p>

            <div className="hero-search">
              <SearchBox variant="hero" mode="either" autoFocus />
            </div>

            <div className="hero-actions">
              <Link href={DEMO_HREF} className="btn btn-primary btn-lg">
                <Sparkles size={17} aria-hidden="true" />
                Try synthetic demo
              </Link>
              <Link href="/explore?mode=snapshot" className="btn btn-lg">
                <Database size={16} aria-hidden="true" />
                Browse stored snapshots
              </Link>
              <Link href="/about" className="btn btn-ghost btn-lg">
                How the data works
              </Link>
            </div>

            <div className="hero-seed">
              <div className="hero-seed-icon">
                <Orbit size={18} aria-hidden="true" />
              </div>
              <div className="hero-seed-copy">
                <div className="hero-seed-title">
                  Orbital Cartography for Research Literature
                </div>
                <div className="hero-seed-meta">
                  Fictional demo seed · 2021 · Journal of Visual Analytics
                </div>
              </div>
              <Link href={DEMO_HREF} className="hero-seed-link">
                Open demo <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div>
            <OrbitArt />
            <div className="orbit-caption" aria-hidden="true">
              <span>
                <i className="color-dot dot-reference" /> References
              </span>
              <span>
                <i className="color-dot dot-citing" /> Citing
              </span>
              <span>
                <i className="color-dot dot-recommended" /> Recommended
              </span>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="features-heading">
          <div className="section-heading">
            <h2 id="features-heading">One neighborhood, three coordinated views</h2>
            <p>
              Move between a spherical overview, a precise radial map, and a
              sortable paper list. Selection, filters, and the year histogram
              stay in step.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">
                <Orbit size={19} aria-hidden="true" />
              </div>
              <h3>A bounded ego-neighborhood</h3>
              <p>
                The center paper anchors every view. References, citing papers,
                and provider recommendations are loaded as labeled samples — not
                a claim to map an entire field.
              </p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <Layers3 size={19} aria-hidden="true" />
              </div>
              <h3>Inspect without losing context</h3>
              <p>
                Select in 3D, trace the same node in 2D, then scan metadata in
                the list. Compare two candidates, save a reading list, and move
                back through a recorded trail.
              </p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <ShieldCheck size={19} aria-hidden="true" />
              </div>
              <h3>Missing data stays visible</h3>
              <p>
                Unknown years, counts, and abstracts are labeled rather than
                coerced to zero. Similarity is computed locally, and
                recommendations are drawn differently from citations.
              </p>
            </article>
          </div>

          <div className="honesty-panel">
            <div>
              <p className="eyebrow">Data honesty</p>
              <h2>Know what you are looking at.</h2>
              <p>
                The bundled demo is a deterministic synthetic catalog. It exists
                to exercise the workflow when live provider access is rate-limited
                or unavailable. It is not real research data and must not be
                cited.
              </p>
              <p>
                Live mode queries OpenAlex through server-side routes on the
                public deployment. A stored-snapshot mode replays three real,
                bounded Semantic Scholar samples captured from the API. Coverage is still bounded, citation
                indexing favors older papers, and local text similarity can miss
                conceptual relationships.
              </p>
            </div>
            <div className="honesty-list">
              <div className="honesty-item">
                <Sparkles size={15} aria-hidden="true" />
                <div>
                  <strong>Synthetic mode is labeled everywhere</strong>
                  <span>
                    A persistent “synthetic” badge and fictional catalog notice
                    travel with search results, graphs, details, and exports.
                  </span>
                </div>
              </div>
              <div className="honesty-item">
                <ShieldCheck size={15} aria-hidden="true" />
                <div>
                  <strong>No invented citations or scores</strong>
                  <span>
                    Citation edges come only from observed provider branches.
                    Recommendation rank is ordering, never a quality judgment.
                  </span>
                </div>
              </div>
              <div className="honesty-item">
                <Database size={15} aria-hidden="true" />
                <div>
                  <strong>Local-first, no account required</strong>
                  <span>
                    Your reading list stays in this browser. Exports contain only
                    saved papers and provenance, never API keys.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
