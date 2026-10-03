import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { ArrowLeft, ChevronUp, Minimize, Music, Search } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { Kbd } from "../components/Kbd.tsx";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";
import { useMediaQuery } from "../hooks/useMediaQuery.ts";
import { usePointerActivity } from "../hooks/usePointerActivity.ts";
import { languageName } from "../projects/languages.ts";
import { findCueAt, findTranslationOf } from "./findCue.ts";
import { type PlayerCallbacks, PlayerControls } from "./PlayerControls.tsx";
import type { PlaybackState, TrackSelection } from "./playback.ts";
import { type SubtitleDisplay, SubtitleOverlay } from "./SubtitleOverlay.tsx";
import { segmentsFromCues } from "./segmentsFromCues.ts";
import { Waveform, type WaveformCallbacks } from "./Waveform.tsx";

type MediaSource = {
  kind: "video" | "audio";
  title: string;
  /** The URL the player loads. Null while the file is still being resolved or converted. */
  url: string | null;
  /** The album art of an audio file, as a URL. */
  artworkUrl: string | null;
  language: string;
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
  /** The word the dictionary pop-up shows, which is highlighted in the subtitles. */
  activeWord?: string;
  /** The waveform segment of the flashcard open in the side panel, which the waveform emphasizes. */
  editingSegmentId: string | null;
  playerCallbacks: PlayerCallbacks;
  waveformCallbacks: WaveformCallbacks;
  onBack: () => void;
  onWordHover: (word: string) => void;
  onWordClick: (word: string) => void;
  onLookup: () => void;
  onAddFlashcard: () => void;
  /** Notices to show above the stage, such as the unsaved-work banner. */
  headerContent?: ReactNode;
  /** The dictionary pop-up, drawn over the lower part of the stage. */
  lookup?: ReactNode;
  /** The subtitles panel or the flashcard editor, docked beside the stage. */
  sidePanel?: ReactNode;
};

/** Whether the device has a pointer that can hover, which decides whether the header and controls hide themselves. */
const hoverQuery = "(hover: hover)";

/**
 * The screen for watching or listening to one media file. It is dark in both themes, like a cinema.
 * The controls lie over the bottom of the stage and show only while the pointer moves or playback is paused.
 * On a device with a mouse, the header shows only while the pointer is near the top.
 * The panels around the stage come in as children, so that each can be wired to the store on its own.
 */
export function MediaView(props: MediaViewProps) {
  const { media, playback, cues, translationCues, panels } = props;
  const activeCue = findCueAt(cues, playback.currentMs);
  const segments = useMemo(
    () => segmentsFromCues(cues, props.flashcardCueIndexes),
    [cues, props.flashcardCueIndexes],
  );
  const canHover = useMediaQuery(hoverQuery);
  const pointer = usePointerActivity();
  const showsControls = !playback.isPlaying || pointer.isActive;
  const showsHeader =
    !panels.distractionFree && (!canHover || pointer.isNearTop);
  const showsSidePanel = !panels.distractionFree && props.sidePanel != null;
  return (
    <div
      data-theme="dark"
      className="relative flex h-dvh flex-col bg-canvas text-fg"
      onPointerMove={pointer.onPointerMove}
      onPointerLeave={pointer.onPointerLeave}
    >
      {!panels.distractionFree && (
        <Header {...props} isFloating={canHover} isShown={showsHeader} />
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {props.headerContent && (
            <div className="border-b border-line px-3 py-2">
              {props.headerContent}
            </div>
          )}
          <div className="relative flex min-h-40 flex-1 items-center justify-center overflow-hidden bg-black">
            <Stage media={media} />
            <SubtitleOverlay
              targetCue={activeCue}
              translationCue={
                activeCue ? findTranslationOf(activeCue, translationCues) : null
              }
              display={props.subtitleDisplay}
              isRaised={showsControls}
              activeWord={props.activeWord}
              onWordHover={props.onWordHover}
              onWordClick={props.onWordClick}
            />
            {props.lookup && (
              <div className="fixed inset-x-2 top-16 bottom-2 z-30 flex items-end justify-center md:absolute md:inset-x-auto md:top-auto md:bottom-28 md:left-1/2 md:-translate-x-1/2">
                {props.lookup}
              </div>
            )}
            <span
              className={clsx(
                "absolute right-2 z-10 flex items-center gap-1 rounded-md bg-black/50 transition-[bottom]",
                showsControls ? "bottom-22" : "bottom-2",
              )}
            >
              <IconButton label="Look up a word" onClick={props.onLookup}>
                <Search className="size-4" />
              </IconButton>
              <Kbd>L</Kbd>
              <IconButton
                label="New flashcard from this subtitle"
                onClick={props.onAddFlashcard}
              >
                <NewFlashcardIcon className="size-4" />
              </IconButton>
            </span>
            {panels.distractionFree && (
              <span className="absolute top-2 right-2 z-10">
                <IconButton
                  label="Leave distraction-free mode"
                  onClick={props.playerCallbacks.onToggleDistractionFree}
                >
                  <Minimize className="size-4" />
                </IconButton>
              </span>
            )}
            <div
              className={clsx(
                "absolute inset-x-0 bottom-0 z-10 transition-opacity focus-within:pointer-events-auto focus-within:opacity-100",
                !showsControls && "pointer-events-none opacity-0",
              )}
            >
              <PlayerControls
                playback={playback}
                tracks={props.tracks}
                panels={panels}
                callbacks={props.playerCallbacks}
              />
            </div>
          </div>
          {!panels.distractionFree && panels.waveform && (
            <Waveform
              peaks={props.waveform.peaks}
              viewStartMs={props.waveform.viewStartMs}
              viewEndMs={props.waveform.viewEndMs}
              durationMs={playback.durationMs}
              currentMs={playback.currentMs}
              segments={segments}
              editingSegmentId={props.editingSegmentId}
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
          {!panels.distractionFree && !panels.waveform && (
            <button
              type="button"
              aria-label="Show the waveform"
              title="Show the waveform"
              onClick={props.playerCallbacks.onToggleWaveform}
              className="flex h-5 w-full items-center justify-center border-t border-line bg-surface text-fg-faint hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronUp className="size-4" aria-hidden />
            </button>
          )}
        </main>
        {showsSidePanel && (
          <aside className="flex max-h-[45dvh] shrink-0 flex-col border-t border-line bg-canvas md:max-h-none md:w-96 md:border-t-0 md:border-l">
            {props.sidePanel}
          </aside>
        )}
      </div>
    </div>
  );
}

/** The bar with the way back and the file's name. On a device with a mouse it floats over the top and slides away. */
function Header({
  media,
  onBack,
  isFloating,
  isShown,
}: MediaViewProps & { isFloating: boolean; isShown: boolean }) {
  return (
    <header
      className={clsx(
        "flex items-center gap-3 border-b border-line bg-surface px-3 py-2",
        isFloating &&
          "absolute inset-x-0 top-0 z-20 transition-transform focus-within:translate-y-0",
        isFloating && !isShown && "-translate-y-full",
      )}
    >
      <Button variant="subtle" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden />
        Project
      </Button>
      <h1 className="min-w-0 flex-1 truncate font-medium">{media.title}</h1>
      <Badge>{languageName(media.language)}</Badge>
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
