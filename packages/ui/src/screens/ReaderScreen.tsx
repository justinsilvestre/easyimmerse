import {
  skipToken,
  useListMediaFilesQuery,
  useOpenBookQuery,
} from "@easyimmerse/backend";
import {
  actions,
  selectFlashcardForm,
  selectIsReadingLocationLoaded,
  selectPreferencesLoaded,
  selectReaderPreferences,
} from "@easyimmerse/state";
import type { Document, MediaFile, Project } from "@easyimmerse/types";
import { useMemo } from "react";
import { ConnectedFlashcardEditor } from "../flashcards/ConnectedFlashcardEditor.tsx";
import { draftFromText } from "../flashcards/draftFromText.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { LookupPlace } from "../lookup/lookupPlace.ts";
import { useLookupPrefetch } from "../lookup/useLookupPrefetch.ts";
import { useReaderLookup } from "../lookup/useReaderLookup.ts";
import { bookFailureSentence } from "../reader/bookFailureSentence.ts";
import { ConnectedReaderView } from "../reader/ConnectedReaderView.tsx";
import { ReaderStatus } from "../reader/ReaderStatus.tsx";
import { selectNearbySentences } from "../reader/selectNearbySentences.ts";
import { sentenceWordLookups } from "../reader/sentenceWordLookups.ts";
import { unwrapHardLineBreaks } from "../reader/unwrapHardLineBreaks.ts";
import { useBookTranslation } from "../reader/useBookTranslation.tsx";
import { useReaderAudio } from "../reader/useReaderAudio.tsx";
import { useReaderKeyBindings } from "../reader/useReaderKeyBindings.ts";
import { useReaderSentenceRow } from "../reader/useReaderSentenceRow.ts";

/**
 * The screen for reading one of the project's ebooks or text files.
 * The book opens where it was last left, in the appearance last chosen.
 * Words are looked up in the dictionary pop-up as in the subtitles, and a flashcard made from one is filled from its lookup, with its sentence as context,
 * and saved at once, as on the media screen; the pop-up's sentence row plays a sentence's audio and shows its translation.
 * The keys work as `selectReaderKeyBinding` in the state package describes; R and T act on the current sentence's audio and translation,
 * and C and E make a flashcard from the word at the lookup cursor.
 * A book aligned with an audio file plays it from a bar above the progress slider, as `useReaderAudio` describes.
 * Another document of the project can be paired with the book as its translation, and read alone,
 * or once the two are aligned, together with the book.
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
  const isPlaceLoaded = useAppSelector(
    selectIsReadingLocationLoaded(mediaFileId),
  );
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
  if (!mediaFile || !book.currentData || !isPlaceLoaded || !preferencesLoaded)
    return <ReaderStatus title={title} onBack={close} />;
  return (
    <BookReader
      // Each book starts afresh, as the reader's state in the store does when a book opens.
      key={mediaFile.id}
      project={project}
      mediaFile={mediaFile}
      mediaFiles={data?.media_files ?? [mediaFile]}
      document={book.currentData}
    />
  );
}

function BookReader({
  project,
  mediaFile,
  mediaFiles,
  document,
}: {
  project: Project;
  mediaFile: MediaFile;
  /** The project's media files, among which the book's translation is chosen. */
  mediaFiles: readonly MediaFile[];
  document: Document;
}) {
  const dispatch = useAppDispatch();
  const { settings } = project;
  const preferences = useAppSelector((state) =>
    selectReaderPreferences(state.app),
  );
  const form = useAppSelector((state) => selectFlashcardForm(state.app));
  const languages = {
    target: settings.target_language,
    translation: settings.translation_language,
  };
  const text = useMemo(() => unwrapHardLineBreaks(document), [document]);
  const bilingual = useBookTranslation(project, mediaFile, mediaFiles, text);
  /** The draft of a flashcard for a word, with its sentence as context, translated where the book is aligned with its translation. */
  const draftFor = (word: string, place: LookupPlace | null) =>
    draftFromText({
      word,
      sentence: place?.source.kind === "text" ? place.source.sentence : "",
      sentenceTranslation:
        place?.source.kind === "text"
          ? bilingual.passageTranslationAt(place.source.location)
          : "",
      mediaFile,
      settings,
    });
  const audio = useReaderAudio(project.id, mediaFile.id, text);
  const sentence = useReaderSentenceRow(text, bilingual, audio);
  const lookup = useReaderLookup(languages, draftFor, sentence);
  const textLanguage = document.language ?? settings.target_language;
  const nearbySentences = useAppSelector((state) =>
    selectNearbySentences(state, text, mediaFile.id, textLanguage),
  );
  useLookupPrefetch(languages.target, nearbySentences, (sentence) =>
    sentenceWordLookups(sentence, textLanguage),
  );
  const controls = useReaderKeyBindings({
    playAt: audio?.playAt,
    toggleSentenceTranslation: lookup.toggleSentenceTranslation,
    startFlashcardAtCursor: lookup.startFlashcardAtCursor,
  });
  return (
    <ConnectedReaderView
      mediaFileId={mediaFile.id}
      document={text}
      title={document.title || mediaFile.name}
      projectName={settings.name}
      language={textLanguage}
      preferences={preferences}
      controls={controls}
      lookup={lookup.popup && <DictionaryPopup {...lookup.popup.props} />}
      lookupSize={lookup.popup?.size}
      lookupRect={lookup.popup?.rect}
      highlightedWord={lookup.highlightedWord}
      highlightedSentence={lookup.highlightedSentence}
      callbacks={{
        ...lookup.wordGestures,
        onBack: () => dispatch(actions.closeMedia()),
        onLookup: lookup.openSearch,
        onDismissLookup: lookup.close,
        onPointerInsideLookupChange: lookup.popup?.onPointerInsideChange,
        onPreferencesChange: (changed) =>
          dispatch(
            actions.preferenceSet("readerPreferences", JSON.stringify(changed)),
          ),
      }}
      sidePanel={
        form && <ConnectedFlashcardEditor form={form} languages={languages} />
      }
      audio={audio}
      translation={bilingual.translation}
    />
  );
}
