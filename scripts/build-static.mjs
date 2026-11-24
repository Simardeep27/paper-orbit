import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

/**
 * Build the read-only, snapshot/demo-only site for GitHub Pages.
 *
 * The normal Next.js build keeps the live API routes. A static export cannot
 * include route handlers, so this script temporarily moves app/api aside and
 * copies the offline catalogs into public/app-data for the static API bridge
 * in lib/static-api.ts.
 */
const root = process.cwd();
const basePath = (process.env.STATIC_BASE_PATH ?? "").trim();
if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
  throw new Error("STATIC_BASE_PATH must start with '/' and have no trailing slash.");
}

const apiDir = path.join(root, "app", "api");
const apiBackup = path.join(root, ".static-build-api");
const publicData = path.join(root, "public", "app-data");
const outDir = path.join(root, "out");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

try {
  await access(apiDir);
} catch {
  throw new Error("app/api is missing; cannot prepare the static build.");
}
try {
  await access(nextBin);
} catch {
  throw new Error("Next.js is not installed. Run npm ci first.");
}

await rm(apiBackup, { recursive: true, force: true });
await rename(apiDir, apiBackup);

try {
  await rm(publicData, { recursive: true, force: true });
  await mkdir(publicData, { recursive: true });
  await cp(path.join(root, "data", "snapshots"), path.join(publicData, "snapshots"), {
    recursive: true,
  });
  await cp(path.join(root, "data", "demo"), path.join(publicData, "demo"), {
    recursive: true,
  });

  await rm(outDir, { recursive: true, force: true });
  await rm(path.join(root, ".next"), { recursive: true, force: true });

  const result = spawnSync(
    process.execPath,
    [nextBin, "build", "--webpack"],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        STATIC_EXPORT: "1",
        STATIC_BASE_PATH: basePath,
        NEXT_PUBLIC_STATIC_DEMO: "1",
        NEXT_PUBLIC_STATIC_BASE_PATH: basePath,
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(`Static Next.js build failed with status ${result.status}.`);
  }

  await writeFile(path.join(outDir, ".nojekyll"), "");
  console.log(
    `Static export ready at ${outDir}${basePath ? ` (base path ${basePath})` : ""}.`,
  );
} finally {
  await rm(apiDir, { recursive: true, force: true });
  await rename(apiBackup, apiDir);
  await rm(publicData, { recursive: true, force: true });
}
