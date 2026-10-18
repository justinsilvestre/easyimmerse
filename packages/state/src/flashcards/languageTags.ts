/** Tells whether two BCP 47 tags name the same language, ignoring script and region, so that `zh-Hans` matches `zh`. */
export function isSameLanguage(first: string, second: string): boolean {
  return primarySubtag(first) === primarySubtag(second);
}

/** Returns the language of a BCP 47 tag without its script or region, in lowercase, as `zh` for `zh-Hans`. */
export function primarySubtag(tag: string): string {
  return tag.split(/[-_]/)[0]?.toLowerCase() ?? "";
}
