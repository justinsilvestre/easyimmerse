import {
  actions,
  type ReaderLocation,
  type ReaderScreenState,
  type ReaderViewMode,
} from "@easyimmerse/state";
import type { Document } from "@easyimmerse/types";
import { useMemo, useState } from "react";
import type { AnchorRect } from "../lookup/placeAtAnchor.ts";
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
  shownViewMode,
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
  translation,
  dispatch,
}: {
  mediaFileId: string;
  document: Document;
  location: ReaderLocation;
  language: string;
  reader: ReaderScreenState;
  translation?: ReaderTranslation;
  dispatch: (action: ReaderViewAction) => void;
}) {
  const viewMode = shownViewMode(reader.viewMode, translation);
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
      const paragraphs = document.chapters[chapterIndex]?.paragraphs ?? [];
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
            translationDocument,
            chapterIndex,
            paragraphIndex,
            paragraphs[paragraphIndex]?.length ?? 0,
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
    viewMode,
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
    /** Shows another view; the translation-only view opens at the translation of the place being read. */
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

/** The translation of a passage that a held word opened, and where the word lies, at the place the reader was at. */
type ShownTranslation = {
  text: string;
  rect: AnchorRect;
  at: ReaderLocation;
};

/**
 * Shows the translation of the passage a word belongs to when the word is held, by touch or by mouse,
 * where the book is aligned with its translation and shown alone. Elsewhere a held touch does what `onWordHold` does.
 * The translation closes when the reader moves on, since the word it stood beside has moved.
 */
export function useTranslationPopup({
  viewMode,
  translation,
  location,
  onWordHold,
  onOpen,
}: {
  viewMode: ReaderViewMode;
  translation: ReaderTranslation | undefined;
  location: ReaderLocation;
  onWordHold: (word: ReaderWord) => void;
  /** Called as the translation opens, as to close the dictionary pop-up. */
  onOpen: () => void;
}) {
  const [shown, setShown] = useState<ShownTranslation | null>(null);
  const links = viewMode === "target" ? translation?.links : null;
  const translationDocument = translation?.document;
  const show = (word: ReaderWord): boolean => {
    const link = links && linkAt(links, word.location);
    const text =
      link && translationDocument
        ? translationOfLink(translationDocument, link)
        : "";
    if (!text) return false;
    const { top, bottom, left, right } = word.rect;
    onOpen();
    setShown({ text, rect: { top, bottom, left, right }, at: location });
    return true;
  };
  return {
    popup: shown?.at === location && viewMode === "target" ? shown : null,
    close: () => setShown(null),
    onWordHold: (word: ReaderWord) => {
      if (!show(word)) onWordHold(word);
    },
    onWordMouseHold: links && translationDocument ? show : undefined,
  };
}
