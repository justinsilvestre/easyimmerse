import { firstIndexWhere } from "./firstIndexWhere.ts";
import { pageAt } from "./pageLayout.ts";
import type { ReaderLocation } from "./readingProgress.ts";
import {
  characterRect,
  paragraphAttribute,
  paragraphIndexOf,
} from "./textOffsets.ts";

/**
 * Measures where text falls among the pages of a chapter, or of a section of one, laid out in columns.
 * `columns` is the element holding the chapter's columns; `stride` is the distance from one page to the next.
 */
export type PagedText = { columns: HTMLElement; stride: number };

/** The page that shows the location's character. */
export function pageOfLocation(
  text: PagedText,
  location: ReaderLocation,
): number {
  const paragraph = paragraphAt(text.columns, location.paragraphIndex);
  if (!paragraph) {
    const first = paragraphsOf(text.columns)[0];
    const isPastFirst =
      first !== undefined && location.paragraphIndex > paragraphIndexOf(first);
    return isPastFirst ? pageCountOf(text) - 1 : 0;
  }
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
  const position = firstIndexWhere(paragraphs.length, (index) => {
    const rects = paragraphs[index]?.getClientRects();
    const last = rects?.[rects.length - 1];
    return last !== undefined && pageOf(text, last.left) >= page;
  });
  const paragraph = paragraphs[position];
  if (!paragraph) return { chapterIndex, paragraphIndex: 0, offset: 0 };
  const offset = firstIndexWhere(paragraph.textContent?.length ?? 0, (at) => {
    const rect = characterRect(paragraph, at);
    return rect !== null && pageOf(text, rect.left) >= page;
  });
  return { chapterIndex, paragraphIndex: paragraphIndexOf(paragraph), offset };
}

/**
 * The location a turn from one page towards another reports: the first character of the nearest page, going on in the same direction,
 * whose location lies past the page the turn started from. A page whose first character lies on a later page,
 * such as one that holds only a chapter heading, is passed over. Null when no page in that direction will do.
 */
export function locationTurningTo(
  text: PagedText,
  from: number,
  to: number,
  chapterIndex: number,
): ReaderLocation | null {
  const direction = Math.sign(to - from);
  const pageCount = pageCountOf(text);
  for (let page = to; page >= 0 && page < pageCount; page += direction) {
    const location = locationOfPage(text, page, chapterIndex);
    const landing = pageOfLocation(text, location);
    if (Math.sign(landing - from) === direction) return location;
  }
  return null;
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

/** The element of the paragraph with the given index in its chapter, if it is rendered. */
export function paragraphAt(
  container: HTMLElement,
  paragraphIndex: number,
): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    `[${paragraphAttribute}="${paragraphIndex}"]`,
  );
}

export function paragraphsOf(columns: HTMLElement): HTMLElement[] {
  return Array.from(
    columns.querySelectorAll<HTMLElement>(`[${paragraphAttribute}]`),
  );
}
