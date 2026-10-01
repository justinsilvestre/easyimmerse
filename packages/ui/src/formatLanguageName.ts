/** Names the language of a BCP 47 tag, such as "German" for `de`, in the user's locale unless another is given. Returns the tag itself when it cannot be named. */
export function formatLanguageName(tag: string, locale?: string): string {
  try {
    const names = new Intl.DisplayNames(locale, { type: "language" });
    return names.of(tag) ?? tag;
  } catch {
    return tag;
  }
}
