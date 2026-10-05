import { useListMediaFilesQuery } from "@easyimmerse/backend";
import {
  actions,
  type ReaderLocation,
  selectPreference,
  selectPreferencesLoaded,
  selectReadingLocation,
} from "@easyimmerse/state";
import type { Document, MediaFile, Project } from "@easyimmerse/types";
import { useEffect, useMemo } from "react";
import { draftFromText } from "../flashcards/draftFromText.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { FlashcardSaveNotice } from "../flashcards/FlashcardSaveNotice.tsx";
import { useMediaFlashcards } from "../flashcards/useMediaFlashcards.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { ReaderStatus } from "../reader/ReaderStatus.tsx";
import { ReaderView } from "../reader/ReaderView.tsx";
import { parseReaderPreferences } from "../reader/readerPreferences.ts";
import { useOpenedBook } from "../reader/useOpenedBook.ts";

/**
 * The screen for reading one of the project's ebooks or text files.
 * The book opens where it was last left, in the appearance last chosen, and a clicked word starts a flashcard with its sentence as context.
 */
export function ReaderScreen({
  project,
  mediaFileId,
}: {
  project: Project;
  mediaFileId: string;
}) {
  const dispatch = useAppDispatch();
  const { data } = useListMediaFilesQuery(project.id);
  const mediaFile = data?.media_files.find((file) => file.id === mediaFileId);
  const book = useOpenedBook(mediaFile ?? null);
  const location = useOpeningLocation(mediaFileId);
  const preferencesLoaded = useAppSelector(selectPreferencesLoaded);
  const close = () => dispatch(actions.closeMedia());
  const title = mediaFile?.name ?? "";
  if (data && !mediaFile)
    return (
      <ReaderStatus
        title={title}
        failure="This file is no longer in the project."
        onBack={close}
      />
    );
  if (book.status === "failed")
    return <ReaderStatus title={title} failure={book.cause} onBack={close} />;
  if (
    !mediaFile ||
    book.status === "loading" ||
    location === undefined ||
    !preferencesLoaded
  )
    return <ReaderStatus title={title} onBack={close} />;
  return (
    <BookReader
      project={project}
      mediaFile={mediaFile}
      document={book.document}
      initialLocation={location ?? undefined}
    />
  );
}

/**
 * Reads the book's stored place once.
 * Later reports from the reader leave the result alone, so that reading does not re-render the screen on every scroll.
 */
function useOpeningLocation(mediaFileId: string) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(actions.readingLocationLoadRequested(mediaFileId));
  }, [dispatch, mediaFileId]);
  return useAppSelector(selectReadingLocation(mediaFileId), haveSameLoadState);
}

function haveSameLoadState(
  a: ReaderLocation | null | undefined,
  b: ReaderLocation | null | undefined,
): boolean {
  return (a === undefined) === (b === undefined);
}

function BookReader({
  project,
  mediaFile,
  document,
  initialLocation,
}: {
  project: Project;
  mediaFile: MediaFile;
  document: Document;
  initialLocation?: ReaderLocation;
}) {
  const dispatch = useAppDispatch();
  const { settings } = project;
  const storedPreferences = useAppSelector(
    selectPreference("readerPreferences"),
  );
  const preferences = useMemo(
    () => parseReaderPreferences(storedPreferences),
    [storedPreferences],
  );
  const flashcards = useMediaFlashcards(project.id, mediaFile.id, false);
  const languages = {
    target: settings.target_language,
    translation: settings.translation_language,
  };
  return (
    <ReaderView
      document={document}
      title={document.title || mediaFile.name}
      language={document.language ?? settings.target_language}
      preferences={preferences}
      initialLocation={initialLocation}
      callbacks={{
        onBack: () => dispatch(actions.closeMedia()),
        onLookup: () =>
          dispatch(
            actions.notificationRequested(
              "Dictionary lookups are not available yet.",
            ),
          ),
        onWordHover: () => undefined,
        onWordClick: (word) =>
          flashcards.start(
            draftFromText({
              word: word.text,
              sentence: word.sentence,
              mediaFile,
              settings,
            }),
          ),
        onDismissLookup: () => undefined,
        onLocationChange: (location) =>
          dispatch(actions.readingLocationReported(mediaFile.id, location)),
        onPreferencesChange: (changed) =>
          dispatch(
            actions.preferenceSet("readerPreferences", JSON.stringify(changed)),
          ),
      }}
      headerContent={
        flashcards.isSaved ? (
          <FlashcardSaveNotice
            outcome="savedInProject"
            onDismiss={flashcards.dismissSaved}
          />
        ) : undefined
      }
      sidePanel={
        flashcards.edited && (
          <FlashcardEditor
            key={
              flashcards.edited.kind === "new"
                ? "new"
                : flashcards.edited.flashcard.id
            }
            state={flashcards.edited.editor}
            dispatch={flashcards.edit}
            languages={languages}
            waveform={null}
            onSave={flashcards.save}
            onDelete={flashcards.remove}
            onClose={flashcards.close}
          />
        )
      }
    />
  );
}
