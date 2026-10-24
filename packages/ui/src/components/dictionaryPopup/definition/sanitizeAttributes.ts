const dataKeyPattern = /^[A-Za-z0-9_-]+$/;
const languageTagPattern = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/;
const maximumTableSpan = 1000;

/** Turns a dictionary's `data` object into `data-sc-<key>` attributes, which dictionary stylesheets select on. Drops keys that are not plain names. */
export function dataAttributes(
  data: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(data ?? {}))
    if (dataKeyPattern.test(key)) attributes[`data-sc-${key}`] = value;
  return attributes;
}

/** Returns `lang` if it has the shape of a BCP 47 language tag. */
export function languageTag(
  lang: string | null | undefined,
): string | undefined {
  return lang && languageTagPattern.test(lang) ? lang : undefined;
}

/** Returns a table cell's column or row span if it is a positive whole number, capped so a cell cannot stretch a table without bound. */
export function tableSpan(span: number | undefined): number | undefined {
  if (span === undefined || !Number.isInteger(span) || span < 1)
    return undefined;
  return Math.min(span, maximumTableSpan);
}
