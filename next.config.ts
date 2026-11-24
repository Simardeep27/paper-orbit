import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";
const staticBasePath = process.env.STATIC_BASE_PATH?.trim() ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(staticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
        ...(staticBasePath ? { basePath: staticBasePath } : {}),
      }
    : {}),
};

export default nextConfig;
