/** License texts keyed by the URL they were fetched from. */
export type LicenseTexts = Record<string, string>;

/** Returns the text fetched from `url`, cut to its first `lineCount` lines when given. */
export function quoteLicenseText(
  url: string,
  texts: LicenseTexts,
  lineCount?: number,
): string {
  const text = texts[url];
  if (text === undefined) {
    throw new Error(
      `the license text from ${url} is missing; run \`mise run ffmpeg-notices\``,
    );
  }
  const lines = text.trimEnd().split("\n");
  return lines.slice(0, lineCount ?? lines.length).join("\n");
}
