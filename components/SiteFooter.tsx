import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>
          Paper Orbit · a local research exploration prototype. Not a complete
          citation index.
        </span>
        <nav className="site-footer-links" aria-label="Footer">
          <Link href="/about">Data sources &amp; limitations</Link>
          <Link href="/reading-list">Reading list</Link>
          <Link href="/explore?center=syn-paper-001&mode=demo">
            Synthetic demo
          </Link>
          <a
            href="https://www.semanticscholar.org/?utm_source=api"
            target="_blank"
            rel="noreferrer noopener"
          >
            Semantic Scholar
          </a>
        </nav>
      </div>
    </footer>
  );
}
