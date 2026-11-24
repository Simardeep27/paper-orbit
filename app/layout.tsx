import type { Metadata, Viewport } from "next";
import { StaticApiBridge } from "@/components/StaticApiBridge";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Paper Orbit — Explore the research around a paper",
    template: "%s · Paper Orbit",
  },
  description:
    "Paper Orbit is a research observatory for exploring the references, citing papers, and recommendations around a known publication.",
  applicationName: "Paper Orbit",
};

export const viewport: Viewport = {
  themeColor: "#0B1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <div className="app-backdrop" aria-hidden="true" />
        <StaticApiBridge />
        {children}
      </body>
    </html>
  );
}
