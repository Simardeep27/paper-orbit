import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreClient } from "@/components/ExploreClient";

export const metadata: Metadata = {
  title: "Explore a paper neighborhood",
  description:
    "Explore references, citing papers, and recommendations around one central publication in coordinated 3D, 2D, and list views.",
};

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreClient />
    </Suspense>
  );
}
