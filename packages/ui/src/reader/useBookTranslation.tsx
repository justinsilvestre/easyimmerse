import {
  skipToken,
  useListAlignmentsQuery,
  useListPluginsQuery,
  useOpenBookQuery,
} from "@easyimmerse/backend";
import {
  actions,
  isDocumentFileName,
  latestAlignments,
  type ReaderLocation,
  selectIsBilingualEbookDialogOpen,
} from "@easyimmerse/state";
import type { Document, MediaFile, Project } from "@easyimmerse/types";
import { useMemo } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { linkAt, translationOfLink } from "./alignment/translationAlignment.ts";
import { BilingualEbookDialog } from "./BilingualEbookDialog.tsx";
import type { ReaderTranslation } from "./readerTranslation.ts";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";

/**
 * Loads the translation a book is paired with, and its newest translation alignment when it is with that translation,
 * for the reader's translation panel and views. Pairing goes through the store, as does combining the two into a bilingual ebook,
 * which opens a dialog, which the reader shows, that tells that easyImmerse cannot align the two yet.
 * Also returns the passage of the translation aligned with a place in the book, for a flashcard's context and the dictionary pop-up's sentence row.
 */
export function useBookTranslation(
  project: Project,
  mediaFile: MediaFile,
  mediaFiles: readonly MediaFile[],
  /** The book's text as the reader shows it, in which the places translated lie. */
  bookText: Document,
) {
  const dispatch = useAppDispatch();
  const paired =
    mediaFiles.find(({ id }) => id === mediaFile.translation_media_file_id) ??
    null;
  const book = useOpenBookQuery(
    paired ? { name: paired.name, source: paired.source } : skipToken,
  );
  const document = useMemo(
    () => (book.currentData ? unwrapHardLineBreaks(book.currentData) : null),
    [book.currentData],
  );
  const { data: listed } = useListAlignmentsQuery({
    projectId: project.id,
    mediaFileId: mediaFile.id,
  });
  const aligned = useMemo(
    () => latestAlignments(listed?.alignments ?? []).translation,
    [listed],
  );
  const links =
    paired && aligned?.translation_media_file_id === paired.id
      ? aligned.links
      : null;
  const candidates = useMemo(
    () =>
      mediaFiles.filter(
        ({ id, name }) => id !== mediaFile.id && isDocumentFileName(name),
      ),
    [mediaFiles, mediaFile.id],
  );
  const isCombining = useAppSelector(selectIsBilingualEbookDialogOpen);
  const plugins = useListPluginsQuery(isCombining ? undefined : skipToken);
  const alignmentPlugins = plugins.data
    ? plugins.data.plugins.filter(({ kind }) => kind === "alignment")
    : plugins.isError
      ? []
      : null;
  const translation: ReaderTranslation = {
    candidates,
    paired,
    document,
    language: document?.language ?? project.settings.translation_language,
    links,
    onChoose: (translationMediaFileId) =>
      dispatch(
        actions.readerTranslationChosen(
          project.id,
          mediaFile.id,
          translationMediaFileId,
        ),
      ),
    onCombine: () => dispatch(actions.readerCombineRequested()),
    dialog: isCombining && (
      <BilingualEbookDialog
        alignmentPlugins={alignmentPlugins}
        onClose={() => dispatch(actions.readerCombineDialogClosed())}
      />
    ),
  };
  /** The passage of the translation linked with the place in the book, and the book's text it covers, or null where none is linked. */
  const linkedPassageAt = (location: ReaderLocation) => {
    const link = links && linkAt(links, bookText, location);
    return link && document
      ? { translation: translationOfLink(document, link), spans: link.spans }
      : null;
  };
  return {
    translation,
    linkedPassageAt,
    /** The translation of the passage at the place, or an empty string where none is linked. */
    passageTranslationAt: (location: ReaderLocation) =>
      linkedPassageAt(location)?.translation ?? "",
  };
}
