/** Returns the primary language subtag of a BCP 47 tag in lower case, such as `pt` for `pt-BR`. */
export function primaryLanguageSubtag(tag: string): string {
  return tag.trim().split(/[-_]/)[0]?.toLowerCase() ?? "";
}
