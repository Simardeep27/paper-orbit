"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ExplorerShell } from "@/components/ExplorerShell";
import { parseExplorerUrl } from "@/lib/state/url";

/**
 * Reads the query string on the client so /explore can be prerendered for
 * static hosts such as GitHub Pages, where server-side searchParams are not
 * available.
 */
export function ExploreClient() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const initialState = useMemo(() => parseExplorerUrl(search), [search]);

  return <ExplorerShell initialState={initialState} />;
}
