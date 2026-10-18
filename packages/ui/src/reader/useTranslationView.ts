import {
  actions,
  type ReaderLocation,
  type ReaderScreenState,
  type ReaderViewMode,
} from "@easyimmerse/state";
import type { Document } from "@easyimmerse/types";
import { useMemo } from "react";
import {
  interlinearLinesOf,
  parallelRowsOf,
} from "./alignment/bilingualLayout.ts";
import type { ParagraphAddress } from "./alignment/textSpans.ts";
import type { ChapterTranslation } from "./ChapterText.tsx";
import type { ReaderViewAction } from "./ReaderView.tsx";
import {
  type ReaderTranslation,
  translationLocationFor,
  viewModesOf,
} from "./readerTranslation.ts";
import { clampToBook } from "./readingProgress.ts";

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
