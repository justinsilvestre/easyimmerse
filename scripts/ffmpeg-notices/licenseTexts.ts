/** Downloads a license text, decoding the base64 that googlesource serves for `?format=TEXT`. */
async function fetchLicenseText(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok)
    throw new Error(`could not fetch ${url}: ${response.status}`);
  const body = await response.text();
  const text = isBase64Encoded(url)
    ? Buffer.from(body, "base64").toString("utf-8")
    : body;
  return text.replace(/\r\n/g, "\n");
}

function isBase64Encoded(url: string): boolean {
  return (
    new URL(url).hostname.endsWith("googlesource.com") &&
    url.endsWith("format=TEXT")
  );
}

/** Returns the texts for the URLs, reusing known ones unless `refresh` asks to fetch all. */
export async function collectLicenseTexts(
  urls: string[],
  known: Record<string, string>,
  refresh: boolean,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    urls.map(async (url) => {
      const cached = known[url];
      return [
        url,
        cached !== undefined && !refresh ? cached : await fetchLicenseText(url),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}
