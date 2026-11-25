"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { LoaderCircle, Radar, Search } from "lucide-react";
import type {
  ApiErrorBody,
  Paper,
  SearchResultSet,
  SourceMode,
} from "@/lib/types";
import { canonicalizeIdentifier } from "@/lib/identifiers";
import { useRouter } from "next/navigation";
import { SearchResults } from "@/components/SearchResults";

interface SearchBoxProps {
  variant?: "nav" | "hero";
  mode?: SourceMode | "either";
  allowModeSwitch?: boolean;
  defaultMode?: SourceMode;
  autoFocus?: boolean;
  label?: string;
}

function errorFromPayload(payload: unknown, fallback: string): string {
  const body = payload as Partial<ApiErrorBody> | null;
  return body?.error?.message ?? fallback;
}

function isSearchResultSet(value: unknown): value is SearchResultSet {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SearchResultSet>;
  return (
    Array.isArray(candidate.papers) &&
    (candidate.nextOffset === null ||
      typeof candidate.nextOffset === "number") &&
    (candidate.sourceMode === "live" ||
      candidate.sourceMode === "demo" ||
      candidate.sourceMode === "snapshot")
  );
}

export function SearchBox({
  variant = "nav",
  mode = "either",
  allowModeSwitch = mode === "either",
  defaultMode = "demo",
  autoFocus = false,
  label = "Search papers",
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [preferredMode, setPreferredMode] = useState<SourceMode>(
    mode === "either" ? defaultMode : mode,
  );
  const sourceMode: SourceMode =
    mode === "either" ? preferredMode : mode;
  const [results, setResults] = useState<SearchResultSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const noteId = useId();
  const router = useRouter();

  const busy = loading || resolving;

  function navigateToPaper(paperId: string, nextMode: SourceMode): void {
    const params = new URLSearchParams({ center: paperId, mode: nextMode });
    router.push(`/explore?${params.toString()}`);
  }

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (variant !== "nav" || !open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, variant]);

  function resetResults(nextMode: SourceMode) {
    setPreferredMode(nextMode);
    setResults(null);
    setError(null);
    setOpen(false);
    setLastQuery("");
    controllerRef.current?.abort();
  }

  async function runSearch(text: string, offset: number) {
    const generation = requestRef.current + 1;
    requestRef.current = generation;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (offset > 0) setLoadingMore(true);
    else {
      setLoading(true);
      setResults(null);
    }
    setError(null);
    setOpen(true);
    setLastQuery(text);

    try {
      const params = new URLSearchParams({
        q: text,
        offset: String(offset),
        mode: sourceMode,
      });
      const response = await fetch(`/api/search?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        throw new Error(
          errorFromPayload(
            payload,
            "Paper search is unavailable. Please try again.",
          ),
        );
      }
      if (!isSearchResultSet(payload)) {
        throw new Error("The search response was not in the expected format.");
      }
      if (requestRef.current !== generation) return;
      if (offset === 0) {
        setResults(payload);
      } else {
        setResults((previous) =>
          previous
            ? {
                ...payload,
                papers: [...previous.papers, ...payload.papers],
              }
            : payload,
        );
      }
    } catch (caught) {
      if (controller.signal.aborted || requestRef.current !== generation) {
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Paper search is unavailable. Please try again.",
      );
      setResults(null);
    } finally {
      if (requestRef.current === generation) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  async function resolveIdentifier(value: string): Promise<void> {
    const generation = requestRef.current + 1;
    requestRef.current = generation;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setResolving(true);
    setError(null);
    setOpen(true);
    setResults(null);

    try {
      const params = new URLSearchParams({ id: value, mode: sourceMode });
      const response = await fetch(`/api/resolve?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        throw new Error(
          errorFromPayload(
            payload,
            "That identifier could not be resolved. Check it and try again.",
          ),
        );
      }
      const candidate = payload as {
        paper?: Paper;
        sourceMode?: SourceMode;
      } | null;
      if (!candidate?.paper?.id) {
        throw new Error("The identifier response was not in the expected format.");
      }
      if (requestRef.current !== generation) return;
      navigateToPaper(candidate.paper.id, candidate.sourceMode ?? sourceMode);
    } catch (caught) {
      if (controller.signal.aborted || requestRef.current !== generation) {
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "That identifier could not be resolved. Check it and try again.",
      );
    } finally {
      if (requestRef.current === generation) setResolving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!text) {
      setError("Enter a paper title, author, DOI, or arXiv ID.");
      setResults(null);
      setOpen(true);
      inputRef.current?.focus();
      return;
    }
    const canonical = canonicalizeIdentifier(text);
    if (canonical.kind === "query") {
      await runSearch(canonical.value, 0);
    } else {
      await resolveIdentifier(canonical.value);
    }
  }

  function handleSelect(paper: Paper, resultMode: SourceMode) {
    setOpen(false);
    navigateToPaper(paper.id, resultMode);
  }

  const note =
    sourceMode === "demo"
      ? "Synthetic interaction demo — every title is fictional. No live request is made."
      : sourceMode === "snapshot"
        ? "Stored Semantic Scholar snapshots — bounded real-data samples; no live request is made."
        : "Live OpenAlex mode — key-free; sampled branches, provider rate limits apply.";

  return (
    <div
      className={`search ${variant === "hero" ? "search-hero" : ""}`}
      ref={rootRef}
    >
      <form
        className="search-form"
        role="search"
        onSubmit={handleSubmit}
        aria-label={label}
      >
        {allowModeSwitch ? (
          <div className="search-mode" aria-label="Search data mode">
            <button
              type="button"
              aria-pressed={sourceMode === "demo"}
              onClick={() => resetResults("demo")}
              title="Search the offline synthetic catalog"
            >
              Demo
            </button>
            <button
              type="button"
              aria-pressed={sourceMode === "snapshot"}
              onClick={() => resetResults("snapshot")}
              title="Search stored Semantic Scholar snapshots"
            >
              Snapshot
            </button>
            <button
              type="button"
              aria-pressed={sourceMode === "live"}
              onClick={() => resetResults("live")}
              title="Search OpenAlex live"
            >
              Live
            </button>
          </div>
        ) : null}
        <input
          ref={inputRef}
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search papers, paste a DOI, or enter an arXiv ID"
          aria-label="Search papers, paste a DOI, or enter an arXiv ID"
          aria-describedby={noteId}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          onFocus={() => {
            if (results || error || loading) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
        <button
          type="submit"
          className="search-submit"
          disabled={busy}
          aria-label="Explore paper"
        >
          {busy ? (
            <LoaderCircle size={15} className="spin-icon" aria-hidden="true" />
          ) : (
            <Search size={15} aria-hidden="true" />
          )}
          <span>{busy ? "Working" : "Explore"}</span>
        </button>
      </form>

      {open ? (
        <SearchResults
          results={results}
          mode={sourceMode}
          loading={loading || resolving}
          loadingMore={loadingMore}
          error={error}
          inline={variant === "hero"}
          onSelect={handleSelect}
          onLoadMore={() => {
            if (results?.nextOffset !== null && results?.nextOffset !== undefined) {
              void runSearch(lastQuery, results.nextOffset);
            }
          }}
        />
      ) : null}

      <p className="search-hero-note" id={noteId}>
        <Radar size={13} aria-hidden="true" />
        <span>{note}</span>
      </p>
    </div>
  );
}
