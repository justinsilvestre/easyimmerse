import {
  actions,
  type ReaderLocation,
  type ReaderScreenState,
  type ReaderTranslationPopup,
  type ReaderViewMode,
} from "@easyimmerse/state";
import type { Document } from "@easyimmerse/types";
import { useMemo } from "react";
import {
  interlinearLinesOf,
  parallelRowsOf,
} from "./alignment/bilingualLayout.ts";
import type { ParagraphAddress } from "./alignment/textSpans.ts";
import { linkAt, translationOfLink } from "./alignment/translationAlignment.ts";
import type { ChapterTranslation } from "./ChapterText.tsx";
import type { ReaderViewAction } from "./ReaderView.tsx";
import {
  type ReaderTranslation,
  translationLocationFor,
  viewModesOf,
} from "./readerTranslation.ts";
import { clampToBook } from "./readingProgress.ts";
import type { ReaderWord } from "./useWordPointer.ts";

/**
 * Works out the text the reader shows in the view chosen: the book, or in the translation-only view the translation,
 * each with its place and language, and in the bilingual views the translation shown with each chapter.
 * The translation-only view keeps a place of its own in the reader's state, and its moves are dispatched there,
 * so that the stored place stays the book's.
 */
export function useTranslationView({
  mediaFileId,
  document,
  location,
  language,
  reader,
  viewMode,
  translation,
  dispatch,
}: {
  mediaFileId: string;
  document: Document;
  location: ReaderLocation;
  language: string;
  reader: Pick<ReaderScreenState, "translationLocation">;
  /** The view shown, as `selectShownReaderViewMode` decides. */
  viewMode: ReaderViewMode;
  translation?: ReaderTranslation;
  dispatch: (action: ReaderViewAction) => void;
}) {
  const translationDocument = translation?.document ?? null;
  const links = translation?.links ?? null;
  const translationLanguage = translation?.language ?? language;
  const isTranslationShown =
    viewMode === "translation" && translationDocument !== null;
  const translationLocation = useMemo(
    () =>
      translationDocument &&
      clampToBook(translationDocument, reader.translationLocation),
    [translationDocument, reader.translationLocation],
  );
  const shown =
    isTranslationShown && translationLocation
      ? {
          document: translationDocument,
          location: translationLocation,
          language: translationLanguage,
        }
      : { document, location, language };
  const chapterIndex = shown.location.chapterIndex;
  const isBilingual = viewMode === "parallel" || viewMode === "interlinear";
  const parallelRows = useMemo(
    () =>
      isBilingual && links && translationDocument
        ? parallelRowsOf(links, document, translationDocument)
        : null,
    [isBilingual, links, document, translationDocument],
  );
  const chapterTranslation = useMemo((): ChapterTranslation | undefined => {
    if (!links || !translationDocument || !parallelRows) return undefined;
    const paragraphsAt = (addresses: readonly ParagraphAddress[]) =>
      addresses.map(
        ({ chapterIndex, paragraphIndex }) =>
          translationDocument.chapters[chapterIndex]?.paragraphs[
            paragraphIndex
          ] ?? "",
      );
    const titleParagraphs = paragraphsAt(
      parallelRows.besideTitle(chapterIndex),
    );
    if (viewMode === "interlinear") {
      // Each paragraph's links are looked for among the chapter's alone, which keeps a long book quick to show.
      const chapterLinks = links.filter(({ spans }) =>
        spans.some((span) => span.chapter_index === chapterIndex),
      );
      return {
        layout: "interlinear",
        language: translationLanguage,
        titleParagraphs,
        linesOf: (paragraphIndex) =>
          interlinearLinesOf(
            chapterLinks,
            document,
            translationDocument,
            chapterIndex,
            paragraphIndex,
          ),
      };
    }
    return {
      layout: "parallel",
      language: translationLanguage,
      titleParagraphs,
      paragraphsBeside: (paragraphIndex) =>
        paragraphsAt(
          parallelRows.besideParagraph(chapterIndex, paragraphIndex),
        ),
    };
  }, [
    viewMode,
    links,
    translationDocument,
    translationLanguage,
    document,
    chapterIndex,
    parallelRows,
  ]);
  return {
    viewModes: viewModesOf(translation),
    isTranslationShown,
    ...shown,
    chapterTranslation,
    reportLocation: (reported: ReaderLocation) =>
      dispatch(
        isTranslationShown
          ? actions.readerTranslationLocationReported(reported)
          : actions.readingLocationReported(mediaFileId, reported),
      ),
    jumpTo: (to: ReaderLocation) =>
      dispatch(
        isTranslationShown
          ? actions.readerTranslationJumped(to)
          : actions.readerJumped(mediaFileId, to),
      ),
    chooseMatch: (index: number, at: ReaderLocation) =>
      dispatch(
        isTranslationShown
          ? actions.readerTranslationJumped(at, index)
          : actions.readerMatchChosen(mediaFileId, index, at),
      ),
    /** Shows another view; the translation-only view opens at the translation of the place being read, or where it was left. */
    chooseViewMode: (mode: ReaderViewMode) =>
      dispatch(
        actions.readerViewModeChosen(
          mode,
          mode === "translation"
            ? translationLocationFor(links, location)
            : undefined,
        ),
      ),
  };
}

/**
 * Shows the translation of the passage a word belongs to when the word is held, by touch or by mouse,
 * where the book is aligned with its translation and shown alone. Elsewhere a held touch does what `onWordHold` does.
 * The pop-up itself is the reader's state, which the store opens and closes, as `updateReaderScreen` describes;
 * here its text is found among the alignment's links, and the pop-up is left out when the text has none.
 */
export function useTranslationPopup({
  viewMode,
  document,
  translation,
  popup,
  onWordHold,
  dispatch,
}: {
  viewMode: ReaderViewMode;
  /** The book's text, in which the held words lie. */
  document: Document;
  translation: ReaderTranslation | undefined;
  /** The pop-up open in the reader's state, if any. */
  popup: ReaderTranslationPopup | null;
  onWordHold: (word: ReaderWord) => void;
  dispatch: (action: ReaderViewAction) => void;
}) {
  const links = viewMode === "target" ? translation?.links : null;
  const translationDocument = translation?.document;
  const translationAt = (location: ReaderLocation): string => {
    const link = links && linkAt(links, document, location);
    return link && translationDocument
      ? translationOfLink(translationDocument, link)
      : "";
  };
  const show = (word: ReaderWord): boolean => {
    if (translationAt(word.location) === "") return false;
    const { top, bottom, left, right } = word.rect;
    dispatch(
      actions.readerTranslationPopupOpened(word.location, {
        top,
        bottom,
        left,
        right,
      }),
    );
    return true;
  };
  const text = popup === null ? "" : translationAt(popup.location);
  return {
    popup: popup !== null && text !== "" ? { text, rect: popup.anchor } : null,
    onWordHold: (word: ReaderWord) => {
      if (!show(word)) onWordHold(word);
    },
    onWordMouseHold: links && translationDocument ? show : undefined,
  };
}
