"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bookmark, Info } from "lucide-react";
import type { SourceMode } from "@/lib/types";
import { useReadingListStore } from "@/lib/state/reading-list";
import { SearchBox } from "@/components/SearchBox";

interface SiteHeaderProps {
  searchMode?: SourceMode | "either";
  searchDefaultMode?: SourceMode;
  showSearch?: boolean;
  onOpenData?: () => void;
  dataHref?: string;
}

export function SiteHeader({
  searchMode = "either",
  searchDefaultMode = "demo",
  showSearch = true,
  onOpenData,
  dataHref = "/about",
}: SiteHeaderProps) {
  const hydrate = useReadingListStore((state) => state.hydrate);
  const items = useReadingListStore((state) => state.items);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Paper Orbit home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Paper Orbit</span>
        </Link>

        {showSearch ? (
          <div className="header-search">
            <SearchBox
              key={searchDefaultMode}
              variant="nav"
              mode={searchMode}
              allowModeSwitch={searchMode === "either"}
              defaultMode={searchDefaultMode}
            />
          </div>
        ) : (
          <div className="toolbar-spacer" />
        )}

        <nav className="header-actions" aria-label="Main">
          <Link href="/reading-list" className="header-link">
            <Bookmark size={15} aria-hidden="true" />
            <span className="header-label">Reading list</span>
            <span className="count-badge" aria-label={`${items.length} saved`}>
              {items.length}
            </span>
          </Link>
          {onOpenData ? (
            <button type="button" className="header-link" onClick={onOpenData}>
              <Info size={15} aria-hidden="true" />
              <span className="header-label">Data info</span>
            </button>
          ) : (
            <Link href={dataHref} className="header-link">
              <Info size={15} aria-hidden="true" />
              <span className="header-label">Data info</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
