import type {
  ApiErrorBody,
  ApiErrorCode,
  Neighborhood,
  Paper,
  ResolveResult,
  SearchResultSet,
  SourceMode,
} from "@/lib/types";
import { canonicalizeIdentifier } from "@/lib/identifiers";
import {
  searchCatalog,
  type CatalogEntry,
} from "@/lib/providers/catalog";

/**
 * Static-host fallback for the read-only demo on GitHub Pages. The normal
 * Next.js build never enables this module; server routes remain authoritative
 * when the app is deployed to a host that can run them.
 */
const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";
const BASE = process.env.NEXT_PUBLIC_STATIC_BASE_PATH ?? "";
const API_MARKER = "/api/";
const DATA_PREFIX = `${BASE}/app-data/`;

interface StaticManifest {
  generatedAt: string;
  availableCenterIds: string[];
  catalog: CatalogEntry[];
  centers: Array<{
    id: string;
    title: string;
    file: string;
    mode: string;
  }>;
}

interface RawNeighborhood extends Omit<Neighborhood, "mode" | "provider"> {
  mode: string;
  provider: string;
}

interface StaticApiWindow extends Window {
  __paperOrbitStaticApiInstalled?: boolean;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
): Response {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      retryable: false,
    },
  };
  return jsonResponse(body, status);
}

function modeDirectory(mode: SourceMode): "snapshots" | "demo" {
  return mode === "snapshot" ? "snapshots" : "demo";
}

function parseMode(value: string | null): SourceMode {
  return value === "snapshot" || value === "demo" ? value : "live";
}

function assertStaticMode(mode: SourceMode): Response | null {
  if (mode !== "live") return null;
  return errorResponse(
    "PROVIDER_CONFIGURATION",
    "Live mode is unavailable in this static demo. Use Demo or Snapshot mode.",
    503,
  );
}

async function loadManifest(
  mode: SourceMode,
  nativeFetch: typeof window.fetch,
): Promise<StaticManifest> {
  const response = await nativeFetch(
    `${DATA_PREFIX}${modeDirectory(mode)}/manifest.json`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Static demo data is unavailable.");
  }
  return (await response.json()) as StaticManifest;
}

function asResult(
  page: { papers: Paper[]; nextOffset: number | null },
  mode: SourceMode,
  manifest: StaticManifest,
): SearchResultSet {
  return {
    ...page,
    sourceMode: mode,
    fetchedAt: manifest.generatedAt,
    ...(mode === "demo"
      ? { demoAvailableCenterIds: manifest.availableCenterIds }
      : { snapshotAvailableCenterIds: manifest.availableCenterIds }),
  };
}

async function handleSearch(
  url: URL,
  nativeFetch: typeof window.fetch,
): Promise<Response> {
  const query = url.searchParams.get("q")?.trim() ?? "";
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  const mode = parseMode(url.searchParams.get("mode"));

  if (query.length < 2 || query.length > 300) {
    return errorResponse(
      "INVALID_INPUT",
      "Search query must contain between 2 and 300 characters.",
      400,
    );
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 1000) {
    return errorResponse("INVALID_INPUT", "Invalid search offset.", 400);
  }

  const liveError = assertStaticMode(mode);
  if (liveError) return liveError;

  const manifest = await loadManifest(mode, nativeFetch);
  return jsonResponse(
    asResult(searchCatalog(manifest.catalog, query, offset, 10), mode, manifest),
  );
}

async function handleResolve(
  url: URL,
  nativeFetch: typeof window.fetch,
): Promise<Response> {
  const input = url.searchParams.get("id")?.trim() ?? "";
  const mode = parseMode(url.searchParams.get("mode"));

  if (!input) {
    return errorResponse("INVALID_INPUT", "Enter a paper identifier.", 400);
  }

  const liveError = assertStaticMode(mode);
  if (liveError) return liveError;

  const manifest = await loadManifest(mode, nativeFetch);
  const canonical = canonicalizeIdentifier(input);
  if (canonical.kind === "query") {
    const page = searchCatalog(manifest.catalog, canonical.value, 0, 1);
    const paper = page.papers[0];
    if (!paper) {
      return errorResponse(
        "NOT_FOUND",
        "No paper in the static catalog matched that search.",
        404,
      );
    }
    return jsonResponse({ paper, sourceMode: mode } satisfies ResolveResult);
  }

  const paper = manifest.catalog.find(
    (entry) => entry.paper.id === canonical.value,
  )?.paper;
  if (!paper) {
    return errorResponse(
      "NOT_FOUND",
      "That identifier is not present in the static catalog.",
      404,
    );
  }
  return jsonResponse({ paper, sourceMode: mode } satisfies ResolveResult);
}

async function handleNeighborhood(
  url: URL,
  nativeFetch: typeof window.fetch,
): Promise<Response> {
  const paperId = url.searchParams.get("paperId")?.trim() ?? "";
  const mode = parseMode(url.searchParams.get("mode"));

  if (!paperId) {
    return errorResponse("INVALID_INPUT", "A paper ID is required.", 400);
  }

  const liveError = assertStaticMode(mode);
  if (liveError) return liveError;

  const manifest = await loadManifest(mode, nativeFetch);
  const center = manifest.centers.find((entry) => entry.id === paperId);
  if (!center) {
    return errorResponse(
      "DEMO_CENTER_UNAVAILABLE",
      "This paper's neighborhood is not included in the static demo. It can still be inspected from a loaded neighborhood.",
      404,
    );
  }

  const response = await nativeFetch(
    `${DATA_PREFIX}${modeDirectory(mode)}/${center.file}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    return errorResponse(
      "PROVIDER_UNAVAILABLE",
      "The stored neighborhood file could not be loaded.",
      503,
    );
  }
  const raw = (await response.json()) as RawNeighborhood;
  const neighborhood: Neighborhood = {
    ...raw,
    mode: mode === "snapshot" ? "snapshot" : "synthetic-demo",
    provider: mode === "snapshot" ? "semantic-scholar" : "synthetic-test",
    ...(mode === "snapshot"
      ? {
          offline: {
            availableCenterIds: manifest.availableCenterIds,
            notice:
              "Stored Semantic Scholar snapshot. The neighborhood is a bounded sample, not a complete citation graph.",
          },
        }
      : {
          demo: {
            availableCenterIds: manifest.availableCenterIds,
            notice:
              "Synthetic interaction demo. This offline neighborhood is fictional.",
          },
        }),
  };
  return jsonResponse(neighborhood);
}

function endpointFrom(url: URL): string | null {
  const index = url.pathname.indexOf(API_MARKER);
  if (index < 0) return null;
  return url.pathname
    .slice(index + API_MARKER.length)
    .replace(/\/+$/, "");
}

async function handle(
  url: URL,
  nativeFetch: typeof window.fetch,
): Promise<Response> {
  const endpoint = endpointFrom(url);
  if (endpoint === null) {
    return errorResponse("NOT_FOUND", "Unknown static API endpoint.", 404);
  }
  switch (endpoint) {
    case "search":
      return handleSearch(url, nativeFetch);
    case "resolve":
      return handleResolve(url, nativeFetch);
    case "neighborhood":
      return handleNeighborhood(url, nativeFetch);
    case "health":
      return jsonResponse({
        ok: true,
        liveConfigured: false,
        liveKeyConfigured: false,
        demoAvailable: true,
        snapshotAvailable: true,
      });
    default:
      return errorResponse("NOT_FOUND", "Unknown static API endpoint.", 404);
  }
}

function toUrl(input: RequestInfo | URL): URL | null {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  try {
    return new URL(raw, window.location.href);
  } catch {
    return null;
  }
}

export function installStaticApi(): () => void {
  if (!STATIC_DEMO || typeof window === "undefined") return () => {};
  const scopedWindow = window as StaticApiWindow;
  if (scopedWindow.__paperOrbitStaticApiInstalled) return () => {};

  const nativeFetch = window.fetch.bind(window);
  scopedWindow.__paperOrbitStaticApiInstalled = true;

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = toUrl(input);
    if (!url || endpointFrom(url) === null) {
      return nativeFetch(input, init);
    }
    return handle(url, nativeFetch).catch(() =>
      errorResponse(
        "PROVIDER_UNAVAILABLE",
        "The static demo data could not be loaded.",
        503,
      ),
    );
  };

  return () => {
    window.fetch = nativeFetch;
    delete scopedWindow.__paperOrbitStaticApiInstalled;
  };
}

// Install as soon as this client module is evaluated, before child effects
// trigger an initial neighborhood load. The bridge remains as an idempotent
// fallback for client transitions.
if (typeof window !== "undefined") {
  installStaticApi();
}
