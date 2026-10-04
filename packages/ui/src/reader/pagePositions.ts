import { firstIndexWhere } from "./firstIndexWhere.ts";
import { pageAt } from "./pageLayout.ts";
import type { ReaderLocation } from "./readingProgress.ts";
import { characterRect, paragraphAttribute } from "./textOffsets.ts";

/**
 * Measures where text falls among the pages of a chapter laid out in columns.
 * `columns` is the element holding the chapter's columns; `stride` is the distance from one page to the next.
 */
export type PagedText = { columns: HTMLElement; stride: number };

/** The page that shows the location's character. */
export function pageOfLocation(
  text: PagedText,
  location: ReaderLocation,
): number {
  const paragraphs = paragraphsOf(text.columns);
  const paragraph = paragraphs[location.paragraphIndex];
  if (!paragraph)
    return location.paragraphIndex > 0 ? pageCountOf(text) - 1 : 0;
  const rect =
    characterRect(paragraph, location.offset) ?? paragraph.getClientRects()[0];
  return rect ? pageOf(text, rect.left) : 0;
}

/** The first character shown on the page. */
export function locationOfPage(
  text: PagedText,
  page: number,
  chapterIndex: number,
): ReaderLocation {
  const paragraphs = paragraphsOf(text.columns);
  const paragraphIndex = firstIndexWhere(paragraphs.length, (index) => {
    const rects = paragraphs[index]?.getClientRects();
    const last = rects?.[rects.length - 1];
    return last !== undefined && pageOf(text, last.left) >= page;
  });
  const paragraph = paragraphs[paragraphIndex];
  if (!paragraph) return { chapterIndex, paragraphIndex: 0, offset: 0 };
  const offset = firstIndexWhere(paragraph.textContent?.length ?? 0, (at) => {
    const rect = characterRect(paragraph, at);
    return rect !== null && pageOf(text, rect.left) >= page;
  });
  return { chapterIndex, paragraphIndex, offset };
}

/** How many pages the chapter fills, measured by where its last paragraph ends. */
export function pageCountOf(text: PagedText): number {
  const last = paragraphsOf(text.columns).at(-1)?.getClientRects();
  const end = last?.[last.length - 1];
  return end ? pageOf(text, end.left) + 1 : 1;
}

function pageOf(text: PagedText, left: number): number {
  return pageAt(left - text.columns.getBoundingClientRect().left, text.stride);
}

export function paragraphsOf(columns: HTMLElement): HTMLElement[] {
  return Array.from(
    columns.querySelectorAll<HTMLElement>(`[${paragraphAttribute}]`),
  );
}
