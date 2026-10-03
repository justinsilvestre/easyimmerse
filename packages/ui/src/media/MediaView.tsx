import type { Cue } from "@easyimmerse/types";
import { ArrowLeft, Minimize, Music } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import type {
  FlashcardContent,
  FlashcardFieldKey,
} from "../flashcards/flashcardFields.ts";
import { UnsavedWorkBanner } from "../flashcards/UnsavedWorkBanner.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import type { LookupState } from "../lookup/lookupState.ts";
import { languageName } from "../projects/languages.ts";
import { CuePanel } from "./CuePanel.tsx";
import { findCueAt, findTranslationOf } from "./findCue.ts";
import { type PlayerCallbacks, PlayerControls } from "./PlayerControls.tsx";
import type { PlaybackState, TrackSelection } from "./playback.ts";
import { type SubtitleDisplay, SubtitleOverlay } from "./SubtitleOverlay.tsx";
import { segmentsFromCues } from "./segmentsFromCues.ts";
import {
  type SegmentEditing,
  Waveform,
  type WaveformCallbacks,
} from "./Waveform.tsx";

type MediaSource = {
  kind: "video" | "audio";
  title: string;
  /** The URL the player loads. Null while the file is still being resolved or converted. */
  url: string | null;
  /** The album art of an audio file, as a URL. */
  artworkUrl: string | null;
  language: string;
};

/** The pop-up over the subtitles, in hover mode for a word under the pointer or in search mode after the lookup shortcut. */
type LookupPanel = {
  state: LookupState | null;
  mode: "hover" | "search";
};

/** The flashcard open in the side panel, with the fields the project's settings include. */
type FlashcardEditing = {
  id: string;
  content: FlashcardContent;
  fields: readonly FlashcardFieldKey[];
  segment: SegmentEditing | null;
};

type MediaViewProps = {
  media: MediaSource;
  playback: PlaybackState;
  tracks: TrackSelection;
  cues: readonly Cue[];
  translationCues: readonly Cue[];
  flashcardCueIndexes: readonly number[];
  /** The peaks of the whole file. The waveform shows the part between the two times. */
  waveform: {
    peaks: readonly number[];
    viewStartMs: number;
    viewEndMs: number;
  };
  panels: { cues: boolean; waveform: boolean; distractionFree: boolean };
  subtitleDisplay: SubtitleDisplay;
  lookup: LookupPanel | null;
  editingFlashcard: FlashcardEditing | null;
  work: { hasUnsavedChanges: boolean; isBackedUp: boolean };
  playerCallbacks: PlayerCallbacks;
  waveformCallbacks: WaveformCallbacks;
  onBack: () => void;
  onWordHover: (word: string) => void;
  onWordClick: (word: string) => void;
  onToggleSubtitleDisplay: () => void;
  onGenerateSubtitles: () => void;
  onSearchLookup: (term: string) => void;
  onCreateFlashcard: (term: string, entryIndex: number | null) => void;
  onCloseLookup: () => void;
  onSetUpDictionary: () => void;
  onSaveFlashcard: (
    content: FlashcardContent,
    fields: readonly FlashcardFieldKey[],
  ) => void;
  onDeleteFlashcard: () => void;
  onCloseFlashcard: () => void;
  onSaveProject: () => void;
  onLogIn: () => void;
};

/** The screen for watching or listening to one media file. It is dark in both themes, like a cinema. */
export function MediaView(props: MediaViewProps) {
  const {
    media,
    playback,
    cues,
    translationCues,
    panels,
    lookup,
    editingFlashcard,
  } = props;
  const activeCue = findCueAt(cues, playback.currentMs);
  const activeWord =
    lookup?.state && lookup.state.kind !== "noDictionary"
      ? lookup.state.term
      : undefined;
  const showsSidePanel =
    !panels.distractionFree && (editingFlashcard !== null || panels.cues);
  const segments = useMemo(
    () => segmentsFromCues(cues, props.flashcardCueIndexes),
    [cues, props.flashcardCueIndexes],
  );
  return (
    <div data-theme="dark" className="flex h-screen flex-col bg-canvas text-fg">
      {!panels.distractionFree && <Header {...props} />}
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
            <Stage media={media} />
            <SubtitleOverlay
              targetCue={activeCue}
              translationCue={
                activeCue ? findTranslationOf(activeCue, translationCues) : null
              }
              hasTranslation={translationCues.length > 0}
              display={props.subtitleDisplay}
              activeWord={activeWord}
              onWordHover={props.onWordHover}
              onWordClick={props.onWordClick}
              onToggleDisplay={props.onToggleSubtitleDisplay}
            />
            {lookup && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                <DictionaryPopup
                  state={lookup.state}
                  mode={lookup.mode}
                  onSearch={props.onSearchLookup}
                  onCreateFlashcard={props.onCreateFlashcard}
                  onClose={props.onCloseLookup}
                  onSetUpDictionary={props.onSetUpDictionary}
                />
              </div>
            )}
            {panels.distractionFree && (
              <span className="absolute top-2 right-2">
                <IconButton
                  label="Leave distraction-free mode"
                  onClick={props.playerCallbacks.onToggleDistractionFree}
                >
                  <Minimize className="size-4" />
                </IconButton>
              </span>
            )}
          </div>
          {!panels.distractionFree && panels.waveform && (
            <Waveform
              peaks={props.waveform.peaks}
              viewStartMs={props.waveform.viewStartMs}
              viewEndMs={props.waveform.viewEndMs}
              durationMs={playback.durationMs}
              currentMs={playback.currentMs}
              segments={segments}
              editing={editingFlashcard?.segment ?? null}
              canZoomIn={
                props.waveform.viewEndMs - props.waveform.viewStartMs > 5_000
              }
              canZoomOut={
                props.waveform.viewEndMs - props.waveform.viewStartMs <
                playback.durationMs
              }
              callbacks={props.waveformCallbacks}
            />
          )}
          {!panels.distractionFree && (
            <PlayerControls
              playback={playback}
              tracks={props.tracks}
              panels={panels}
              callbacks={props.playerCallbacks}
            />
          )}
        </main>
        {showsSidePanel && (
          <aside className="flex w-96 shrink-0 flex-col border-l border-line bg-canvas">
            {editingFlashcard ? (
              <FlashcardEditor
                key={editingFlashcard.id}
                initialContent={editingFlashcard.content}
                initialFields={editingFlashcard.fields}
                onSave={props.onSaveFlashcard}
                onDelete={props.onDeleteFlashcard}
                onClose={props.onCloseFlashcard}
              />
            ) : (
              <CuePanel
                cues={cues}
                translationCues={translationCues}
                activeCueIndex={activeCue?.index ?? null}
                flashcardCueIndexes={props.flashcardCueIndexes}
                activeWord={activeWord}
                onSeek={props.playerCallbacks.onSeek}
                onWordHover={props.onWordHover}
                onWordClick={props.onWordClick}
                onAddSubtitlesFile={props.playerCallbacks.onAddSubtitlesFile}
                onGenerateSubtitles={props.onGenerateSubtitles}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function Header({
  media,
  work,
  onBack,
  onSaveProject,
  onLogIn,
}: MediaViewProps) {
  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2">
      <Button variant="subtle" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden />
        Project
      </Button>
      <h1 className="min-w-0 flex-1 truncate font-medium">{media.title}</h1>
      <Badge>{languageName(media.language)}</Badge>
      <UnsavedWorkBanner
        hasUnsavedChanges={work.hasUnsavedChanges}
        isBackedUp={work.isBackedUp}
        onSave={onSaveProject}
        onLogIn={onLogIn}
      />
    </header>
  );
}

function Stage({ media }: { media: MediaSource }) {
  if (media.kind === "video") {
    return (
      <video
        src={media.url ?? undefined}
        preload="metadata"
        className="max-h-full max-w-full"
        aria-label={media.title}
      >
        {/* The subtitles are drawn by the overlay rather than by the browser, so a captions track would be a duplicate. */}
        <track kind="captions" />
      </video>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      {media.artworkUrl ? (
        <img
          src={media.artworkUrl}
          alt="Album art"
          className="size-56 rounded-lg object-cover shadow-xl"
        />
      ) : (
        <div className="flex size-56 items-center justify-center rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-xl">
          <Music className="size-20 text-gray-400" aria-hidden />
        </div>
      )}
      <p className="text-lg text-fg-muted">{media.title}</p>
    </div>
  );
}
