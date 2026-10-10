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
import { useReaderKeyBindings } from "../reader/useReaderKeyBindings.ts";

/**
 * The screen for reading one of the project's ebooks or text files.
 * The book opens where it was last left, in the appearance last chosen.
 * Words are looked up in the dictionary pop-up as in the subtitles, and a flashcard made from one is filled from its lookup, with its sentence as context.
 * The keys work as `selectReaderKeyBinding` in the state package describes.
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
      project={project}
      mediaFile={mediaFile}
      document={book.currentData}
    />
  );
}

function BookReader({
  project,
  mediaFile,
  document,
}: {
  project: Project;
  mediaFile: MediaFile;
  document: Document;
}) {
  const dispatch = useAppDispatch();
  const { settings } = project;
  const preferences = useAppSelector((state) =>
    selectReaderPreferences(state.app),
  );
  const controls = useReaderKeyBindings();
  const form = useAppSelector((state) => selectFlashcardForm(state.app));
  const languages = {
    target: settings.target_language,
    translation: settings.translation_language,
  };
  /** The draft of a flashcard for a word, with its sentence as context. */
  const draftFor = (word: string, place: LookupPlace | null) =>
    draftFromText({
      word,
      sentence: place?.source.kind === "text" ? place.source.sentence : "",
      mediaFile,
      settings,
    });
  const lookup = useReaderLookup(languages, draftFor);
  const text = useMemo(() => unwrapHardLineBreaks(document), [document]);
  const textLanguage = document.language ?? settings.target_language;
  const nearbySentences = useAppSelector((state) =>
    selectNearbySentences(state, text, mediaFile.id, textLanguage),
  );
  useLookupPrefetch(languages.target, nearbySentences, (sentence) =>
    sentenceWordLookups(sentence, textLanguage),
  );
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
    />
  );
}
