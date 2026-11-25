import type { ProviderName } from "@/lib/types";

export function providerLabel(provider: ProviderName | string): string {
  switch (provider) {
    case "openalex":
      return "OpenAlex";
    case "semantic-scholar":
      return "Semantic Scholar";
    case "synthetic-test":
      return "Synthetic test";
    default:
      return provider;
  }
}

export function providerHomepage(provider: ProviderName | string): string {
  return provider === "openalex"
    ? "https://openalex.org/"
    : "https://www.semanticscholar.org/?utm_source=api";
}
