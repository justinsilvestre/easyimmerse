import {
  skipToken,
  useListMediaFilesQuery,
  useOpenBookQuery,
} from "@easyimmerse/backend";
import {
  actions,
  type ReaderLocation,
  selectPreference,
  selectPreferencesLoaded,
} from "@easyimmerse/state";
import type { Document, MediaFile, Project } from "@easyimmerse/types";
import { useMemo, useState } from "react";
import { draftFromText } from "../flashcards/draftFromText.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { isAwaitingLookup } from "../flashcards/saveStage.ts";
import { useMediaFlashcards } from "../flashcards/useMediaFlashcards.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import type { LookupPlace } from "../lookup/lookupPlace.ts";
import { useLookupPrefetch } from "../lookup/useLookupPrefetch.ts";
import { useReaderLookup } from "../lookup/useReaderLookup.ts";
import { bookFailureSentence } from "../reader/bookFailureSentence.ts";
import { ReaderStatus } from "../reader/ReaderStatus.tsx";
import { ReaderView } from "../reader/ReaderView.tsx";
import { parseReaderPreferences } from "../reader/readerPreferences.ts";
import { sentenceWordLookups } from "../reader/sentenceWordLookups.ts";
import { useOpeningLocation } from "../reader/useOpeningLocation.ts";

/**
 * The screen for reading one of the project's ebooks or text files.
 * The book opens where it was last left, in the appearance last chosen.
 * Words are looked up in the dictionary pop-up as in the subtitles, and a flashcard made from one is filled from its lookup, with its sentence as context.
 * The L key looks up the word under the mouse, or opens the pop-up's search field when the mouse is on no word.
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
  const book = useOpenBookQuery(
    mediaFile ? { name: mediaFile.name, source: mediaFile.source } : skipToken,
  );
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
  if (book.error)
    return (
      <ReaderStatus
        title={title}
        failure={bookFailureSentence(book.error)}
        onBack={close}
      />
    );
  if (
    !mediaFile ||
    !book.currentData ||
    location === undefined ||
    !preferencesLoaded
  )
    return <ReaderStatus title={title} onBack={close} />;
  return (
    <BookReader
      project={project}
      mediaFile={mediaFile}
      document={book.currentData}
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
    place: LookupPlace | null,
    lookupFields: LookupFlashcardFields | null,
    lateFields?: Promise<LookupFlashcardFields | null>,
  ) => {
    const draft = draftFromText({
      word,
      sentence: place?.source.kind === "text" ? place.source.sentence : "",
      mediaFile,
      settings,
    });
    const started = lookupFields
      ? { ...draft, content: { ...draft.content, ...lookupFields } }
      : draft;
    flashcards.start(started, lateFields);
  };
  const lookup = useReaderLookup(languages, startFlashcard);
  const textLanguage = document.language ?? settings.target_language;
  const [nearbySentences, setNearbySentences] = useState<readonly string[]>([]);
  useLookupPrefetch(languages.target, nearbySentences, (sentence) =>
    sentenceWordLookups(sentence, textLanguage),
  );
  return (
    <ReaderView
      document={document}
      title={document.title || mediaFile.name}
      projectName={settings.name}
      language={textLanguage}
      preferences={preferences}
      initialLocation={initialLocation}
      lookup={lookup.popup && <DictionaryPopup {...lookup.popup.props} />}
      lookupSize={lookup.popup?.size}
      lookupRect={lookup.popup?.rect}
      highlightedWord={lookup.highlightedWord}
      callbacks={{
        ...lookup.wordGestures,
        onBack: () => dispatch(actions.closeMedia()),
        onLookup: lookup.openSearch,
        onLookupKey: lookup.lookUpPointedWord,
        onDismissLookup: lookup.close,
        onPointerInsideLookupChange: lookup.popup?.onPointerInsideChange,
        onLocationChange: (location) =>
          dispatch(actions.readingLocationReported(mediaFile.id, location)),
        onNearbySentencesChange: setNearbySentences,
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
