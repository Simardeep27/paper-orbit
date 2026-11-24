import type { Metadata } from "next";
import { ReadingListPage } from "@/components/ReadingListPage";

export const metadata: Metadata = {
  title: "Reading list",
  description:
    "Your locally saved papers and notes, with Markdown and JSON exports.",
};

export default function ReadingListRoute() {
  return <ReadingListPage />;
}
