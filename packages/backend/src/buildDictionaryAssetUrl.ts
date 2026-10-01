import { getBackendClient } from "./configureBackend.ts";

/**
 * Builds the URL of a file inside a dictionary archive, such as an image that a glossary item refers to.
 * Returns null when the backend cannot serve files by URL.
 */
export function buildDictionaryAssetUrl(
  dictionaryId: string,
  path: string,
): string | null {
  const client = getBackendClient();
  if (client.resolveUrl === undefined) return null;
  return client.resolveUrl({
    method: "GET",
    path: `/dictionaries/${dictionaryId}/asset`,
    query: { path },
  });
}
