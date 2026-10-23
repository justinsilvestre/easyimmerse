import type { AnchorRect } from "@easyimmerse/state";
import type { LookupQuery } from "@easyimmerse/types";
import type { ViewportPoint } from "../components/characterAtPoint.ts";
import { paragraphWordAt } from "../reader/paragraphWordAt.ts";
import { caretAtPoint, offsetWithin } from "../reader/textOffsets.ts";
import { pageBlockOf } from "./pageBlockOf.ts";
import { type DetectLanguage, pageLanguageOf } from "./pageLanguageOf.ts";

/**
 * A word of a web page under the pointer: the word as the pop-up shows it, its lookup, and where it is drawn in the window,
 * which `measure` finds again once the page scrolls or its layout changes.
 */
export type PageWord = {
  term: string;
  query: LookupQuery;
  rect: AnchorRect;
  measure: () => AnchorRect;
};

/**
 * Finds the word of a web page under a point of the window, as `paragraphWordAt` finds it in the block of text around the point,
 * in the language that `pageLanguageOf` finds there. Null when the point lies on no word.
 */
export async function pageWordAtPoint(
  point: ViewportPoint,
  detectLanguage: DetectLanguage,
): Promise<PageWord | null> {
  const caret = caretAtPoint(point.x, point.y);
  const block = caret?.node instanceof Text ? pageBlockOf(caret.node) : null;
  if (!caret || !block) return null;
  const language = await pageLanguageOf(block, detectLanguage);
  const offset = offsetWithin(block, caret.node, caret.offset);
  const word = paragraphWordAt(block, offset, point, language);
  if (!word) return null;
  const { range, line } = word;
  return {
    term: word.text,
    query: { ...word.lookup, language },
    rect: anchorRectOf(word.rect),
    measure: () =>
      anchorRectOf(
        range.getClientRects()[line] ?? range.getBoundingClientRect(),
      ),
  };
}

function anchorRectOf({ top, bottom, left, right }: DOMRect): AnchorRect {
  return { top, bottom, left, right };
}
