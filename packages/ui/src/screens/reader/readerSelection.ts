import type { AnchorRect } from "@easyimmerse/state";
import { selectionWithin } from "../../components/wordLookup/textSelection.ts";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";
import {
  isInTranslation,
  paragraphAttribute,
  paragraphIndexOf,
  paragraphTextOf,
} from "./textOffsets.ts";
import type { ReaderWord } from "./wordAtPoint.ts";

/**
 * The text selected within one paragraph of the chapter shown, as a word that looks up exactly that text, with where it ends;
 * null when nothing is selected or the selection reaches beyond one paragraph or into a translation.
 */
export function readerSelectionIn(
  chapterIndex: number,
  language: string,
): { word: ReaderWord; end: number } | null {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0)
    return null;
  const range = selection.getRangeAt(0);
  const paragraph = paragraphOf(range.startContainer);
  if (!paragraph || paragraph !== paragraphOf(range.endContainer)) return null;
  const selected = selectionWithin(paragraph, (node) => !isInTranslation(node));
  if (!selected) return null;
  const { sentence, lookup } = sentenceLookupAt(
    paragraphTextOf(paragraph),
    selected.start,
    language,
  );
  const word: ReaderWord = {
    text: selected.text,
    isUnspaced: false,
    sentence,
    location: {
      chapterIndex,
      paragraphIndex: paragraphIndexOf(paragraph),
      offset: selected.start,
    },
    lookup: { ...lookup, text: selected.text },
    rect: rectOf(selected.rect),
  };
  return { word, end: selected.end };
}

function paragraphOf(node: Node): Element | null {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(`[${paragraphAttribute}]`) ?? null;
}

/** The selection's rectangle, or an empty one at the window's corner where the browser cannot measure it. */
function rectOf(rect: AnchorRect | null): DOMRect {
  return rect
    ? new DOMRect(
        rect.left,
        rect.top,
        rect.right - rect.left,
        rect.bottom - rect.top,
      )
    : new DOMRect();
}
