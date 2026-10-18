import { type RefObject, useRef } from "react";
import type { PageTurner } from "./PagedChapter.tsx";
import type { CursorStepper } from "./useReaderKeyboardCursor.ts";

/**
 * The parts of the reader view that its keys work: the turner of the paged layout's pages, the search panel's field,
 * and the stepper of the lookup cursor the keyboard placed in the text.
 */
export type ReaderControls = {
  pageTurner: RefObject<PageTurner | null>;
  searchInput: RefObject<HTMLInputElement | null>;
  cursorStepper: RefObject<CursorStepper | null>;
};

/** Holds the reader view's controls, for the view and for the keys bound beside it. */
export function useReaderControls(): ReaderControls {
  return {
    pageTurner: useRef<PageTurner>(null),
    searchInput: useRef<HTMLInputElement>(null),
    cursorStepper: useRef<CursorStepper>(null),
  };
}
