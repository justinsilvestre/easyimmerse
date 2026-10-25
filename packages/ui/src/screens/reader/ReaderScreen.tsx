import {
  skipToken,
  useListMediaFilesQuery,
  useOpenBookQuery,
} from "@easyimmerse/backend";
import {
  actions,
  documentOfLibraryText,
  selectFlashcardForm,
  selectIsReadingLocationLoaded,
  selectPreferencesLoaded,
  selectReaderPreferences,
} from "@easyimmerse/state";
import type { Document, MediaFile, Project } from "@easyimmerse/types";
import { useMemo } from "react";
import { DictionaryPopup } from "../../components/dictionaryPopup/DictionaryPopup.tsx";
import { ConnectedFlashcardEditor } from "../../components/flashcardEditor/ConnectedFlashcardEditor.tsx";
import { LibraryEditingBar } from "../../components/libraryEditing/LibraryEditingBar.tsx";
import type { LibraryItemText } from "../../components/wordLookup/libraryWords.ts";
import type { LookupPlace } from "../../components/wordLookup/lookupPlace.ts";
import { useLookupPrefetch } from "../../components/wordLookup/useLookupPrefetch.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useNavigate } from "../../useNavigate.ts";
import { bookFailureSentence } from "./bookFailureSentence.ts";
import { ConnectedReaderView } from "./ConnectedReaderView.tsx";
import { draftFromText } from "./draftFromText.ts";
import { ReaderStatus } from "./ReaderStatus.tsx";
import { selectNearbySentences } from "./selectNearbySentences.ts";
import { sentenceWordLookups } from "./sentenceWordLookups.ts";
import { storedWordSpansOf, storedWordsOf } from "./storedWords.ts";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";
import { useBookTranslation } from "./useBookTranslation.tsx";
import { useReaderAudio } from "./useReaderAudio.tsx";
import { useReaderKeyBindings } from "./useReaderKeyBindings.ts";
import { useReaderLookup } from "./useReaderLookup.ts";
import { useReaderSentenceRow } from "./useReaderSentenceRow.ts";

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
 * A file from the library is read from its item's text, whose words show their stored entries in the pop-up without being looked up,
 * and every flashcard made from it is a library flashcard; it cannot be paired with a translation.
 * While a library manager prepares the item, every word can be clicked and any text selected, the stored words are underlined,
 * the pop-up gives the text an entry for learners, as `useWordLookup` describes, and no flashcard is made;
 * a bar under the toolbar leads back to the item's details, as does the way back.
 */
export function ReaderScreen({
  project,
  mediaFileId,
  library,
}: {
  project: Project;
  mediaFileId: string;
  /** The library item the file comes from, with its text, or unset for a file from anywhere else. */
  library?: LibraryItemText;
}) {
  const dispatch = useAppDispatch();
  const { data } = useListMediaFilesQuery(project.id);
  const mediaFile = data?.media_files.find((file) => file.id === mediaFileId);
  const opened = useOpenBookQuery(
    mediaFile && !library
      ? { name: mediaFile.name, source: mediaFile.source }
      : skipToken,
  );
  const libraryItem = library?.item;
  const libraryText = library?.text;
  const libraryDocument = useMemo(
    () =>
      libraryItem &&
      libraryText &&
      documentOfLibraryText(libraryText, libraryItem),
    [libraryItem, libraryText],
  );
  const book = {
    error: opened.error,
    currentData: libraryDocument ?? opened.currentData,
  };
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
      library={library}
    />
  );
}

function BookReader({
  project,
  mediaFile,
  mediaFiles,
  document,
  library,
}: {
  project: Project;
  mediaFile: MediaFile;
  /** The project's media files, among which the book's translation is chosen. */
  mediaFiles: readonly MediaFile[];
  document: Document;
  library?: LibraryItemText;
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
  // A library item's paragraphs stay as stored, since its words are placed by their offsets.
  const isFromLibrary = library !== undefined;
  const text = useMemo(
    () => (isFromLibrary ? document : unwrapHardLineBreaks(document)),
    [document, isFromLibrary],
  );
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
  const libraryText = library?.text;
  const isEditing = library?.isEditing ?? false;
  const storedWords = useMemo(
    () => (libraryText && !isEditing ? storedWordsOf(libraryText) : undefined),
    [libraryText, isEditing],
  );
  const markedSpans = useMemo(
    () =>
      libraryText && isEditing ? storedWordSpansOf(libraryText) : undefined,
    [libraryText, isEditing],
  );
  const navigate = useNavigate();
  const close = () =>
    library?.isEditing
      ? navigate({ type: "editLibraryItem", itemId: library.item.id })
      : dispatch(actions.closeMedia());
  const audio = useReaderAudio(project.id, mediaFile.id, text);
  const sentence = useReaderSentenceRow(text, bilingual, audio);
  const lookup = useReaderLookup(
    languages,
    draftFor,
    sentence,
    library && {
      ...library,
      projectId: project.id,
      mediaFileId: mediaFile.id,
      wordlessSource: sentence.spokenPlace?.source ?? null,
    },
  );
  const textLanguage = document.language ?? settings.target_language;
  const nearbySentences = useAppSelector((state) =>
    selectNearbySentences(state, text, mediaFile.id, textLanguage),
  );
  useLookupPrefetch(
    languages.target,
    library ? [] : nearbySentences,
    (sentence) => sentenceWordLookups(sentence, textLanguage),
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
      projectName={isEditing ? "Item details" : settings.name}
      language={textLanguage}
      storedWords={storedWords}
      markedSpans={markedSpans}
      headerContent={
        isEditing &&
        library && (
          <LibraryEditingBar
            title={library.item.title}
            kind="text"
            onOpenDetails={close}
          />
        )
      }
      preferences={preferences}
      controls={controls}
      lookup={lookup.popup && <DictionaryPopup {...lookup.popup.props} />}
      lookupSize={lookup.popup?.size}
      lookupRect={lookup.popup?.rect}
      highlightedWord={lookup.highlightedWord}
      highlightedSentence={lookup.highlightedSentence}
      callbacks={{
        ...lookup.wordGestures,
        onBack: close,
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
      translation={library ? undefined : bilingual.translation}
    />
  );
}
