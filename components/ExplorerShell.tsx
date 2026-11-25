"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bookmark,
  Box,
  CircleAlert,
  Database,
  Download,
  GitCompare,
  HelpCircle,
  List,
  LocateFixed,
  PanelRightOpen,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { ViewMode } from "@/lib/types";
import { RELATIONSHIP_LABELS } from "@/lib/types";
import { useExplorerStore } from "@/lib/state/explorer";
import { useReadingListStore } from "@/lib/state/reading-list";
import {
  parseExplorerUrl,
  readBrowserHistoryIndex,
  type UrlExplorerState,
} from "@/lib/state/url";
import {
  getCenterNode,
  getNeighborNodes,
  getVisibleNeighborhood,
} from "@/lib/graph/selectors";
import { downloadDataUrl, downloadSvg, sanitizeFilename } from "@/lib/graph/export";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchBox } from "@/components/SearchBox";
import { FilterPanel } from "@/components/FilterPanel";
import { PaperDetails } from "@/components/PaperDetails";
import { YearHistogram } from "@/components/YearHistogram";
import { PaperList } from "@/components/PaperList";
import { ComparePanel } from "@/components/ComparePanel";
import { ReadingListTab } from "@/components/ReadingListTab";
import { OrbitScene, type OrbitSceneHandle } from "@/components/OrbitScene";
import { RadialGraph, type RadialGraphHandle } from "@/components/RadialGraph";
import { GraphLegend } from "@/components/GraphLegend";
import { HelpDialog } from "@/components/HelpDialog";
import { ProvenanceDialog } from "@/components/ProvenanceDialog";

type DockTab = "papers" | "compare" | "reading";

interface ExplorerShellProps {
  initialState: UrlExplorerState;
}

const DEMO_HREF = "/explore?center=syn-paper-001&mode=demo";
const SNAPSHOT_HREF = "/explore?mode=snapshot";

export function ExplorerShell({ initialState }: ExplorerShellProps) {
  const neighborhood = useExplorerStore((state) => state.neighborhood);
  const status = useExplorerStore((state) => state.status);
  const error = useExplorerStore((state) => state.error);
  const errorCode = useExplorerStore((state) => state.errorCode);
  const loadingCenterId = useExplorerStore((state) => state.loadingCenterId);
  const sourceMode = useExplorerStore((state) => state.sourceMode);
  const view = useExplorerStore((state) => state.view);
  const layout = useExplorerStore((state) => state.layout);
  const filters = useExplorerStore((state) => state.filters);
  const selectedPaperId = useExplorerStore((state) => state.selectedPaperId);
  const compareIds = useExplorerStore((state) => state.compareIds);
  const autoRotate = useExplorerStore((state) => state.autoRotate);
  const webglFailed = useExplorerStore((state) => state.webglFailed);
  const resetCameraNonce = useExplorerStore((state) => state.resetCameraNonce);
  const locateNonce = useExplorerStore((state) => state.locateNonce);
  const announcement = useExplorerStore((state) => state.announcement);
  const loadCenter = useExplorerStore((state) => state.loadCenter);
  const retryCurrent = useExplorerStore((state) => state.retryCurrent);
  const clearError = useExplorerStore((state) => state.clearError);
  const setView = useExplorerStore((state) => state.setView);
  const setLayout = useExplorerStore((state) => state.setLayout);
  const setAutoRotate = useExplorerStore((state) => state.setAutoRotate);
  const requestLocate = useExplorerStore((state) => state.requestLocate);
  const requestResetCamera = useExplorerStore(
    (state) => state.requestResetCamera,
  );
  const announce = useExplorerStore((state) => state.announce);
  const retryWebgl = useExplorerStore((state) => state.retryWebgl);
  const savedItems = useReadingListStore((state) => state.items);
  const orbitRef = useRef<OrbitSceneHandle>(null);
  const radialRef = useRef<RadialGraphHandle>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const detailsToggleRef = useRef<HTMLButtonElement>(null);
  const selectionSeenRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [showCitations, setShowCitations] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [dockTab, setDockTab] = useState<DockTab>("papers");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!initialState.centerId) return;
    const narrow = window.matchMedia("(max-width: 700px)").matches;
    const hasExplicitView = new URLSearchParams(window.location.search).has(
      "view",
    );
    const initialView: ViewMode =
      narrow && !hasExplicitView ? "2d" : initialState.view;
    void loadCenter(initialState.centerId, {
      mode: initialState.sourceMode,
      filters: initialState.filters,
      view: initialView,
      layout: initialState.layout,
      sort: initialState.sort,
      historyMode: "replace",
    });
  }, [initialState, loadCenter]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseExplorerUrl(window.location.search);
      if (!parsed.centerId) return;
      const historyIndex = readBrowserHistoryIndex();
      void loadCenter(parsed.centerId, {
        mode: parsed.sourceMode,
        filters: parsed.filters,
        view: parsed.view,
        layout: parsed.layout,
        sort: parsed.sort,
        historyMode: "none",
        historyIndex: historyIndex ?? undefined,
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadCenter]);

  useEffect(() => {
    if (!selectedPaperId) return;
    if (!selectionSeenRef.current) {
      selectionSeenRef.current = true;
      return;
    }
    setDetailsOpen(true);
  }, [selectedPaperId]);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
    window.requestAnimationFrame(() => filterToggleRef.current?.focus());
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    window.requestAnimationFrame(() => detailsToggleRef.current?.focus());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (event.key === "Escape") {
        if (filtersOpen) closeFilters();
        if (detailsOpen) closeDetails();
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/") {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>(".site-header .search-input")
          ?.focus();
      } else if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDetails, closeFilters, detailsOpen, filtersOpen]);

  const center = neighborhood ? getCenterNode(neighborhood) : undefined;
  const neighbors = neighborhood ? getNeighborNodes(neighborhood) : [];
  const visible = neighborhood
    ? getVisibleNeighborhood(neighborhood, filters)
    : null;

  function handleExport() {
    if (!center) return;
    const base = `paper-orbit-${sanitizeFilename(center.paper.title)}`;
    try {
      if (view === "3d") {
        const png = orbitRef.current?.capturePng();
        if (!png) {
          announce(
            "PNG capture was unavailable in this browser. Switch to 2D and export SVG instead.",
          );
          return;
        }
        downloadDataUrl(png, `${base}-3d.png`);
        announce("Exported the active 3D view as a PNG.");
      } else if (view === "2d") {
        const svg = radialRef.current?.getSvgElement();
        if (!svg) {
          announce("The 2D map is not ready to export yet.");
          return;
        }
        downloadSvg(svg, `${base}-2d.svg`);
        announce("Exported the active 2D map as an SVG.");
      }
    } catch {
      announce(
        "The view could not be exported in this browser. The reading list export remains available.",
      );
    }
  }

  if (!neighborhood) {
    if (status === "loading") {
      return (
        <>
          <SiteHeader showSearch={false} dataHref="/about" />
          <main id="main" className="empty-explorer">
            <div className="empty-explorer-card">
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <h1>Loading the neighborhood</h1>
              <p>
                Fetching a bounded sample of references, citing papers, and
                recommendations around the selected center.
              </p>
            </div>
          </main>
        </>
      );
    }

    if (error) {
      return (
        <>
          <SiteHeader showSearch={false} dataHref="/about" />
          <main id="main" className="empty-explorer">
            <div className="empty-explorer-card">
              <CircleAlert
                size={30}
                color="var(--danger)"
                style={{ margin: "0 auto" }}
                aria-hidden="true"
              />
              <h1>The neighborhood could not load</h1>
              <p>{error}</p>
              <div className="hero-actions" style={{ justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!initialState.centerId) return;
                    void loadCenter(initialState.centerId, {
                      mode: initialState.sourceMode,
                      filters: initialState.filters,
                      view: initialState.view,
                      layout: initialState.layout,
                      sort: initialState.sort,
                      historyMode: "replace",
                    });
                  }}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  Try again
                </button>
                <Link href={SNAPSHOT_HREF} className="btn">
                  <Database size={15} aria-hidden="true" />
                  Browse stored snapshots
                </Link>
                <Link href={DEMO_HREF} className="btn">
                  <Sparkles size={15} aria-hidden="true" />
                  Open synthetic demo
                </Link>
                <Link href="/" className="btn btn-ghost">
                  Back to search
                </Link>
              </div>
              <div style={{ marginTop: 20 }}>
                <p className="filter-help" style={{ marginBottom: 10 }}>
                  Search a different paper, DOI, or arXiv ID:
                </p>
                <SearchBox
                  variant="hero"
                  mode="either"
                  defaultMode={sourceMode}
                />
              </div>
            </div>
          </main>
        </>
      );
    }

    return (
      <>
        <SiteHeader showSearch={false} dataHref="/about" />
        <main id="main" className="empty-explorer">
          <div className="empty-explorer-card">
            <div className="details-empty-icon" style={{ margin: "0 auto" }}>
              <Box size={23} aria-hidden="true" />
            </div>
            <h1>Explore a paper neighborhood</h1>
            <p>
              Search for a title or author, paste a DOI, or enter an arXiv ID.
              Live mode queries OpenAlex; snapshot mode searches stored
              Semantic Scholar samples; demo mode uses a clearly labeled
              fictional catalog.
            </p>
            <SearchBox
              variant="hero"
              mode="either"
              defaultMode={initialState.sourceMode}
              autoFocus
            />
            <div className="hero-actions" style={{ justifyContent: "center", marginTop: 16 }}>
              <Link href={SNAPSHOT_HREF} className="btn btn-primary">
                <Database size={15} aria-hidden="true" />
                Browse stored snapshots
              </Link>
              <Link href={DEMO_HREF} className="btn">
                <Sparkles size={15} aria-hidden="true" />
                Try synthetic demo
              </Link>
              <Link href="/about" className="btn btn-ghost">
                How the data works
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const modeBadge =
    neighborhood.mode === "synthetic-demo"
      ? "Synthetic demo"
      : neighborhood.mode === "snapshot"
        ? "Stored snapshot"
        : "Live provider";
  const isSynthetic = neighborhood.mode === "synthetic-demo";
  const visibleNeighbors = visible?.neighbors.length ?? 0;
  const activeDockTab: DockTab =
    view === "list" && dockTab === "papers"
      ? compareIds.length > 0
        ? "compare"
        : "reading"
      : dockTab;
  const dockTabs: { id: DockTab; label: string; count: number; icon: React.ReactNode }[] = [
    {
      id: "papers",
      label: "Papers",
      count: visibleNeighbors,
      icon: <List size={14} aria-hidden="true" />,
    },
    {
      id: "compare",
      label: "Compare",
      count: compareIds.length,
      icon: <GitCompare size={14} aria-hidden="true" />,
    },
    {
      id: "reading",
      label: "Reading list",
      count: savedItems.length,
      icon: <Bookmark size={14} aria-hidden="true" />,
    },
  ];

  return (
    <>
      <SiteHeader
        searchMode="either"
        searchDefaultMode={sourceMode}
        onOpenData={() => setProvenanceOpen(true)}
      />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <main id="main" className="explorer-page">
        <div className="explorer-main">
          <FilterPanel open={filtersOpen} onClose={closeFilters} />

          <section className="panel viz-panel" aria-label="Neighborhood visualization">
            <div className="viz-center-head">
              <div className="viz-center-copy">
                <div className="viz-center-kicker">
                  <span
                    className={`badge ${
                      isSynthetic ? "badge-synthetic" : "badge-live"
                    }`}
                  >
                    {modeBadge}
                  </span>
                  <span className="viz-center-note">
                    sampled neighborhood · {neighbors.length} loaded
                  </span>
                </div>
                <h1 className="viz-center-title">
                  {center?.paper.title ?? "Center title unavailable"}
                </h1>
              </div>
              <div className="viz-center-meta" aria-label="Branch counts">
                <span>
                  {RELATIONSHIP_LABELS.reference}{" "}
                  <strong>
                    {neighborhood.coverage.references.validDistinctPapers}
                  </strong>
                </span>
                <span>
                  {RELATIONSHIP_LABELS.citing}{" "}
                  <strong>
                    {neighborhood.coverage.citing.validDistinctPapers}
                  </strong>
                </span>
                <span>
                  {RELATIONSHIP_LABELS.recommended}{" "}
                  <strong>
                    {neighborhood.coverage.recommended.validDistinctPapers}
                  </strong>
                </span>
              </div>
            </div>

            <div className="viz-toolbar" role="toolbar" aria-label="Visualization controls">
              <div className="segmented" aria-label="View mode">
                <button
                  type="button"
                  aria-pressed={view === "3d"}
                  onClick={() => setView("3d")}
                  disabled={webglFailed}
                  title={
                    webglFailed
                      ? "3D is unavailable after a WebGL failure"
                      : "3D spherical view"
                  }
                >
                  <Box size={13} aria-hidden="true" />
                  3D
                </button>
                <button
                  type="button"
                  aria-pressed={view === "2d"}
                  onClick={() => setView("2d")}
                >
                  2D
                </button>
                <button
                  type="button"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <List size={13} aria-hidden="true" />
                  List
                </button>
              </div>

              <label className="toolbar-group" style={{ marginLeft: 4 }}>
                <span className="sr-only">Layout</span>
                <select
                  className="select"
                  value={layout}
                  onChange={(event) =>
                    setLayout(
                      event.target.value as "similarity-radius" | "even-shell",
                    )
                  }
                  disabled={view === "list"}
                  aria-label="Neighborhood layout"
                >
                  <option value="similarity-radius">Similarity radius</option>
                  <option value="even-shell">Even shell</option>
                </select>
              </label>

              {view !== "list" ? (
                <div className="edge-toggles" aria-label="Edge visibility">
                  <button
                    type="button"
                    className="edge-toggle"
                    aria-pressed={showCitations}
                    onClick={() => setShowCitations((value) => !value)}
                  >
                    <span className="line-key arrow" aria-hidden="true" />
                    Citations
                  </button>
                  <button
                    type="button"
                    className="edge-toggle"
                    aria-pressed={showRecommendations}
                    onClick={() => setShowRecommendations((value) => !value)}
                  >
                    <span className="line-key dashed" aria-hidden="true" />
                    Recommendations
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                className="icon-btn"
                onClick={requestLocate}
                disabled={!selectedPaperId || view === "list"}
                aria-label="Locate selected paper"
                title="Bring the selected paper into the foreground"
              >
                <LocateFixed size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={requestResetCamera}
                disabled={view === "list"}
                aria-label="Reset camera"
                title="Reset camera"
              >
                <RotateCcw size={16} aria-hidden="true" />
              </button>
              {view === "3d" ? (
                <button
                  type="button"
                  className={`icon-btn${autoRotate ? " isActive" : ""}`}
                  onClick={() => setAutoRotate(!autoRotate)}
                  aria-pressed={autoRotate}
                  disabled={reducedMotion}
                  aria-label={
                    autoRotate ? "Pause auto-rotation" : "Start auto-rotation"
                  }
                  title={
                    reducedMotion
                      ? "Auto-rotation is disabled by reduced-motion preferences"
                      : autoRotate
                        ? "Pause auto-rotation"
                        : "Start slow auto-rotation"
                  }
                >
                  {autoRotate ? (
                    <Pause size={15} aria-hidden="true" />
                  ) : (
                    <Play size={15} aria-hidden="true" />
                  )}
                </button>
              ) : null}

              <div className="toolbar-spacer" />

              <button
                type="button"
                className="btn btn-sm"
                onClick={handleExport}
                disabled={view === "list"}
                title={
                  view === "3d"
                    ? "Download the active 3D view as PNG"
                    : "Download the active 2D map as SVG"
                }
              >
                <Download size={13} aria-hidden="true" />
                {view === "3d" ? "PNG" : "SVG"}
              </button>
              <button
                ref={filterToggleRef}
                type="button"
                className="icon-btn filters-toggle"
                onClick={() => setFiltersOpen(true)}
                aria-label="Open filters"
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
              </button>
              <button
                ref={detailsToggleRef}
                type="button"
                className="icon-btn details-toggle"
                onClick={() => setDetailsOpen((value) => !value)}
                aria-label="Toggle paper details"
                aria-expanded={detailsOpen}
                aria-controls="paper-details"
              >
                <PanelRightOpen size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setHelpOpen(true)}
                aria-label="Open help"
                title="Help and keyboard shortcuts"
              >
                <HelpCircle size={16} aria-hidden="true" />
              </button>
            </div>

            {error ? (
              <div className="banner banner-error" role="alert">
                <CircleAlert
                  size={15}
                  className="banner-icon"
                  aria-hidden="true"
                />
                <span>{error}</span>
                <div className="banner-actions">
                  {errorCode !== "DEMO_CENTER_UNAVAILABLE" ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void retryCurrent()}
                    >
                      <RefreshCw size={12} aria-hidden="true" />
                      Retry
                    </button>
                  ) : (
                    <Link
                      href={sourceMode === "snapshot" ? SNAPSHOT_HREF : DEMO_HREF}
                      className="btn btn-sm"
                    >
                      {sourceMode === "snapshot"
                        ? "Browse snapshots"
                        : "Available demo"}
                    </Link>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={clearError}
                    aria-label="Dismiss error"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {status === "partial" && !error ? (
              <div className="banner banner-warning">
                <CircleAlert
                  size={15}
                  className="banner-icon"
                  aria-hidden="true"
                />
                <span>
                  Some branches are unavailable or incomplete. The graph is a
                  partial sample, not an empty citation record.
                </span>
                <div className="banner-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setProvenanceOpen(true)}
                  >
                    Branch details
                  </button>
                </div>
              </div>
            ) : null}

            {webglFailed ? (
              <div className="banner banner-warning">
                <CircleAlert
                  size={15}
                  className="banner-icon"
                  aria-hidden="true"
                />
                <span>
                  3D rendering is unavailable. The 2D map and every analytical
                  tool remain usable.
                </span>
                <div className="banner-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={retryWebgl}
                  >
                    Retry 3D
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setHelpOpen(true)}
                  >
                    Help
                  </button>
                </div>
              </div>
            ) : null}

            <div className="viz-canvas">
              <div className="viz-status-chip" aria-live="polite">
                <span className={`color-dot ${isSynthetic ? "dot-recommended" : "dot-reference"}`} aria-hidden="true" />
                <span>
                  <strong>{visibleNeighbors}</strong> visible ·{" "}
                  {neighbors.length} loaded
                </span>
                <span className="badge badge-muted">{modeBadge}</span>
              </div>

              {view === "3d" ? (
                <OrbitScene
                  ref={orbitRef}
                  showCitations={showCitations}
                  showRecommendations={showRecommendations}
                />
              ) : view === "2d" ? (
                <RadialGraph
                  ref={radialRef}
                  showCitations={showCitations}
                  showRecommendations={showRecommendations}
                  resetCameraNonce={resetCameraNonce}
                  locateNonce={locateNonce}
                />
              ) : (
                <PaperList immersive />
              )}

              {view !== "list" ? <GraphLegend /> : null}

              {status === "loading" ? (
                <div className="scene-loading" role="status">
                  <div className="spinner" />
                  <h3>
                    Loading the neighborhood around{" "}
                    {loadingCenterId ?? "the selected paper"}
                  </h3>
                  <p>
                    The current graph stays visible. Only the latest recenter
                    request can replace it.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <PaperDetails open={detailsOpen} onClose={closeDetails} />
        </div>

        <div className="bottom-dock panel">
          <YearHistogram />
          <div className="dock-main">
            <div className="dock-tabs" role="tablist" aria-label="Paper workspaces">
              {dockTabs
                .filter(
                  (tab) => !(view === "list" && tab.id === "papers"),
                )
                .map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`dock-tab-${tab.id}`}
                    aria-selected={activeDockTab === tab.id}
                    aria-controls={`dock-panel-${tab.id}`}
                    className="dock-tab"
                    onClick={() => setDockTab(tab.id)}
                  >
                    {tab.icon}
                    {tab.label}
                    <span className="dock-tab-count">{tab.count}</span>
                  </button>
                ))}
              <div className="dock-tab-actions">
                <Link href="/reading-list" className="btn btn-sm btn-ghost">
                  <Bookmark size={12} aria-hidden="true" />
                  <span>Reading list</span>
                </Link>
              </div>
            </div>
            <div
              className="dock-body"
              role="tabpanel"
              id={`dock-panel-${activeDockTab}`}
              aria-labelledby={`dock-tab-${activeDockTab}`}
              tabIndex={0}
            >
              {activeDockTab === "papers" ? <PaperList /> : null}
              {activeDockTab === "compare" ? <ComparePanel /> : null}
              {activeDockTab === "reading" ? <ReadingListTab /> : null}
            </div>
          </div>
        </div>
      </main>

      {filtersOpen ? (
        <button
          type="button"
          className="drawer-backdrop drawer-backdrop-filter"
          aria-label="Close filters"
          onClick={closeFilters}
        />
      ) : null}
      {detailsOpen && selectedPaperId ? (
        <button
          type="button"
          className="drawer-backdrop drawer-backdrop-details"
          aria-label="Close paper details"
          onClick={closeDetails}
        />
      ) : null}

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ProvenanceDialog
        open={provenanceOpen}
        onClose={() => setProvenanceOpen(false)}
      />
    </>
  );
}
