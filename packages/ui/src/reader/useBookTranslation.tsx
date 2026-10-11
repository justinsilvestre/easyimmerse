import {
  skipToken,
  useListAlignmentsQuery,
  useListPluginsQuery,
  useOpenBookQuery,
} from "@easyimmerse/backend";
import {
  actions,
  isDocumentFileName,
  type ReaderLocation,
} from "@easyimmerse/state";
import type { MediaFile, Project } from "@easyimmerse/types";
import { useMemo, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { latestAlignments } from "./alignment/latestAlignments.ts";
import { linkAt, translationOfLink } from "./alignment/translationAlignment.ts";
import { BilingualEbookDialog } from "./BilingualEbookDialog.tsx";
import type { ReaderTranslation } from "./readerTranslation.ts";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";

/**
 * Loads the translation a book is paired with, and its newest translation alignment when it is with that translation,
 * for the reader's translation panel and views. Pairing goes through the store; combining the two into a bilingual ebook
 * opens a dialog that tells what alignment provider it needs, which the reader shows.
 * Also returns the translation of the passage at a place in the book, for a flashcard's context, or an empty string where none is linked.
 */
export function useBookTranslation(
  project: Project,
  mediaFile: MediaFile,
  mediaFiles: readonly MediaFile[],
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
  const [isCombining, setCombining] = useState(false);
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
    onCombine: () => setCombining(true),
    dialog: isCombining && (
      <BilingualEbookDialog
        alignmentPlugins={alignmentPlugins}
        onClose={() => setCombining(false)}
      />
    ),
  };
  const passageTranslationAt = (location: ReaderLocation): string => {
    const link = links && linkAt(links, location);
    return link && document ? translationOfLink(document, link) : "";
  };
  return { translation, passageTranslationAt };
}
