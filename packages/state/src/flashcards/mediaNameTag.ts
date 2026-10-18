/** Turns a media file's name into a tag: without its extension, in lower case, with every run of other characters as one hyphen. */
export function mediaNameTag(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.\s]+$/, "");
  return withoutExtension
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
