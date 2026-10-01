import type { LookupReference } from "@easyimmerse/state";

/**
 * Reads the term and preferred reading from a structured-content link that searches the dictionaries,
 * such as `?query=一の字点&wildcards=off&primary_reading=いちのじてん`.
 * Returns null for any other link.
 */
export function parseSearchLink(href: string): LookupReference | null {
  if (!href.startsWith("?")) return null;
  const parameters = new URLSearchParams(href.slice(1));
  const term = parameters.get("query");
  if (!term) return null;
  return { term, reading: parameters.get("primary_reading") || null };
}
