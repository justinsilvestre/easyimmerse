import { useListMediaFilesQuery } from "@easyimmerse/backend";
import {
  actions,
  type ReaderLocation,
  selectPreference,
  selectPreferencesLoaded,
} from "@easyimmerse/state";
import type { Document, MediaFile, Project } from "@easyimmerse/types";
import { useMemo } from "react";
import { draftFromText } from "../flashcards/draftFromText.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { isAwaitingLookup } from "../flashcards/saveStage.ts";
import { useMediaFlashcards } from "../flashcards/useMediaFlashcards.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { useReaderLookup } from "../lookup/useReaderLookup.ts";
import { ReaderStatus } from "../reader/ReaderStatus.tsx";
import { ReaderView } from "../reader/ReaderView.tsx";
import { parseReaderPreferences } from "../reader/readerPreferences.ts";
import { useOpenedBook } from "../reader/useOpenedBook.ts";
import { useOpeningLocation } from "../reader/useOpeningLocation.ts";
import type { ReaderWord } from "../reader/useWordPointer.ts";

/**
 * The screen for reading one of the project's ebooks or text files.
 * The book opens where it was last left, in the appearance last chosen.
 * Words are looked up in the dictionary pop-up as in the subtitles, and a flashcard made from one is filled from its lookup, with its sentence as context.
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
  /**
   * Starts a flashcard for a word with its sentence as context,
   * filled from its lookup now or, through `lateFields`, once the lookup answers.
   */
  const startFlashcard = (
    word: string,
    source: ReaderWord | null,
    lookupFields: LookupFlashcardFields | null,
    lateFields?: Promise<LookupFlashcardFields | null>,
  ) => {
    const draft = draftFromText({
      word,
      sentence: source?.sentence ?? "",
      mediaFile,
      settings,
    });
    const started = lookupFields
      ? { ...draft, content: { ...draft.content, ...lookupFields } }
      : draft;
    flashcards.start(started, lateFields);
  };
  const lookup = useReaderLookup(languages, startFlashcard);
  return (
    <ReaderView
      document={document}
      title={document.title || mediaFile.name}
      projectName={settings.name}
      language={document.language ?? settings.target_language}
      preferences={preferences}
      initialLocation={initialLocation}
      lookup={lookup.popup && <DictionaryPopup {...lookup.popup.props} />}
      lookupSize={lookup.popup?.size}
      lookupWord={lookup.lookupWord}
      highlightedWord={lookup.highlightedWord}
      callbacks={{
        ...lookup.wordGestures,
        onBack: () => dispatch(actions.closeMedia()),
        onLookup: lookup.openSearch,
        onDismissLookup: lookup.close,
        onPointerInsideLookupChange: lookup.popup?.onPointerInsideChange,
        onLocationChange: (location) =>
          dispatch(actions.readingLocationReported(mediaFile.id, location)),
        onPreferencesChange: (changed) =>
          dispatch(
            actions.preferenceSet("readerPreferences", JSON.stringify(changed)),
          ),
      }}
      sidePanel={
        flashcards.edited && (
          <FlashcardEditor
            key={
              flashcards.edited.kind === "new"
                ? "new"
                : flashcards.edited.flashcard.id
            }
            state={flashcards.edited.editor}
            isNew={flashcards.edited.kind === "new"}
            isAwaitingLookup={isAwaitingLookup(flashcards.edited.stage)}
            hasSaveFailed={flashcards.saveFailed}
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
