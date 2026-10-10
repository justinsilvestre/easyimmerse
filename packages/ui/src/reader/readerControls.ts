import { type RefObject, useRef } from "react";
import type { PageTurner } from "./PagedChapter.tsx";

/** The parts of the reader view that its keys work: the turner of the paged layout's pages, and the search panel's field. */
export type ReaderControls = {
  pageTurner: RefObject<PageTurner | null>;
  searchInput: RefObject<HTMLInputElement | null>;
};

/** Holds the reader view's controls, for the view and for the keys bound beside it. */
export function useReaderControls(): ReaderControls {
  return {
    pageTurner: useRef<PageTurner>(null),
    searchInput: useRef<HTMLInputElement>(null),
  };
}
