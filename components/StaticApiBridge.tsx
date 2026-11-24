"use client";

import { useEffect } from "react";
import { installStaticApi } from "@/lib/static-api";

/**
 * Enables the read-only static demo on GitHub Pages. In the normal server
 * deployment this component is a no-op.
 */
export function StaticApiBridge() {
  useEffect(() => installStaticApi(), []);
  return null;
}
