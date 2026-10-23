import type { BackendResult } from "@easyimmerse/backend";
import type { AnchorRect } from "@easyimmerse/state";
import type { LookupQuery, LookupResponse } from "@easyimmerse/types";
import type { ViewportPoint } from "../components/characterAtPoint.ts";
import type { LookupOutcome } from "../lookup/lookupStateOf.ts";
import type { ViewportSize } from "../lookup/placeAtAnchor.ts";
import type { PopupSize } from "../lookup/popupSize.ts";
import type { PageWord } from "./pageWordAtPoint.ts";

/** What the dictionary pop-up on a web page shows, and where. */
export type PageLookupView = {
  anchor: AnchorRect;
  term: string;
  query: LookupQuery;
  outcome: LookupOutcome;
  size: PopupSize;
};

type PageLookupOptions = {
  /** Finds the word under a point of the window, or null when there is none. */
  wordAt: (point: ViewportPoint) => Promise<PageWord | null>;
  lookUp: (query: LookupQuery) => Promise<BackendResult<LookupResponse>>;
  /** Shows the pop-up as the view describes it, or hides it for null. */
  show: (view: PageLookupView | null) => void;
};

/**
 * Builds the dictionary lookup of a web page, which opens the pop-up at a word pointed at, or moves it there, and looks the word up.
 * Pointing again at the word shown does nothing, and an answer that comes after the pop-up has moved on is dropped.
 * Once the page scrolls or its layout changes, `reanchor` moves the pop-up after its word, or closes it when the word has left the window.
 */
export function createPageLookup({ wordAt, lookUp, show }: PageLookupOptions) {
  let view: PageLookupView | null = null;
  let measure: PageWord["measure"] | null = null;
  const update = (next: PageLookupView | null) => {
    view = next;
    show(view);
  };
  const open = async (term: string, query: LookupQuery, anchor: AnchorRect) => {
    const size = view?.size ?? "compact";
    const opened: PageLookupView = {
      anchor,
      term,
      query,
      outcome: { kind: "pending" },
      size,
    };
    update(opened);
    const outcome = outcomeOf(await lookUp(query));
    if (view?.query === query) update({ ...view, outcome });
  };
  return {
    pointAt: async (point: ViewportPoint) => {
      const word = await wordAt(point);
      if (!word || isSameQuery(word.query, view?.query)) return;
      measure = word.measure;
      await open(word.term, word.query, word.rect);
    },
    reanchor: (viewport: ViewportSize) => {
      if (!view || !measure) return;
      const anchor = measure();
      update(isOutOfView(anchor, viewport) ? null : { ...view, anchor });
    },
    /** Looks up a term typed into the pop-up, in the language of the word it shows. */
    search: async (typed: string) => {
      const term = typed.trim();
      if (view && term !== "")
        await open(
          term,
          { text: term, language: view.query.language },
          view.anchor,
        );
    },
    toggleSize: () => {
      if (view)
        update({
          ...view,
          size: view.size === "compact" ? "expanded" : "compact",
        });
    },
    close: () => {
      if (view) update(null);
    },
  };
}

function outcomeOf(answer: BackendResult<LookupResponse>): LookupOutcome {
  return "data" in answer
    ? { kind: "answered", response: answer.data }
    : { kind: "failed" };
}

function isOutOfView(anchor: AnchorRect, viewport: ViewportSize): boolean {
  return (
    anchor.bottom <= 0 ||
    anchor.right <= 0 ||
    anchor.top >= viewport.height ||
    anchor.left >= viewport.width
  );
}

function isSameQuery(
  query: LookupQuery,
  other: LookupQuery | undefined,
): boolean {
  return (
    other !== undefined &&
    query.text === other.text &&
    query.language === other.language &&
    query.context === other.context &&
    query.offset === other.offset
  );
}
