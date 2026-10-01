import type { Chapter } from "@easyimmerse/types";

/** Returns the chapter's title, or "Chapter n" for a chapter without one. */
export function formatChapterTitle(chapter: Chapter, index: number): string {
  return chapter.title ?? `Chapter ${index + 1}`;
}
