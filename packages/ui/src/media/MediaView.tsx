import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Minimize,
  Search,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { Kbd } from "../components/Kbd.tsx";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";
import { usePointerActivity } from "../hooks/usePointerActivity.ts";
import { useNavigationActions } from "../navigationContext.ts";
import { languageName } from "../projects/languages.ts";
import { findCueAt, findTranslationOf } from "./findCue.ts";
import { type PlayerCallbacks, PlayerControls } from "./PlayerControls.tsx";
import type { PlaybackState, TrackSelection } from "./playback.ts";
import { type SubtitleDisplay, SubtitleOverlay } from "./SubtitleOverlay.tsx";

type MediaViewProps = {
  title: string;
  /** The BCP 47 code of the media's language, or null when it is not known. */
  language: string | null;
  /** The player, drawn centered on the black stage. */
  stage: ReactNode;
  playback: PlaybackState;
  tracks: TrackSelection;
  cues: readonly Cue[];
  translationCues: readonly Cue[];
  /** The waveform strip, drawn under the stage while the waveform panel is shown. Null for media without a waveform. */
  waveform: ReactNode | null;
  panels: { cues: boolean; waveform: boolean; distractionFree: boolean };
  subtitleDisplay: SubtitleDisplay;
  /** The word the dictionary pop-up shows, which is highlighted in the subtitles. */
  activeWord?: string;
  playerCallbacks: PlayerCallbacks;
  onBack: () => void;
  /** Called with the word and the cue it is in. */
  onWordHover: (word: string, cue: Cue) => void;
  onWordClick: (word: string, cue: Cue) => void;
  onLookup: () => void;
  onAddFlashcard: () => void;
  /** Notices to show above the stage, such as the unsaved-work banner. */
  headerContent?: ReactNode;
  /** The dictionary pop-up, drawn over the lower part of the stage. */
  lookup?: ReactNode;
  /** The subtitles panel or the flashcard editor, docked beside the stage. */
  sidePanel?: ReactNode;
};

/**
 * The screen for watching or listening to one media file. It is dark in both themes, like a cinema.
 * The controls lie over the bottom of the stage and show only while the pointer moves or playback is paused.
 * The panels around the stage come in as children, so that each can be wired to the store on its own.
 */
export function MediaView(props: MediaViewProps) {
  const { playback, cues, translationCues, panels } = props;
  const activeCue = findCueAt(cues, playback.currentMs);
  const pointer = usePointerActivity();
  const showsControls = !playback.isPlaying || pointer.isActive;
  const showsSidePanel = !panels.distractionFree && props.sidePanel != null;
  return (
    <div
      data-theme="dark"
      className="flex h-dvh flex-col bg-canvas text-fg"
      onPointerMove={pointer.onPointerMove}
    >
      {!panels.distractionFree && <Header {...props} />}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {props.headerContent && (
            <div className="border-b border-line px-3 py-2">
              {props.headerContent}
            </div>
          )}
          <div className="relative flex min-h-40 flex-1 items-center justify-center overflow-hidden bg-black">
            {props.stage}
            <SubtitleOverlay
              targetCue={activeCue}
              translationCue={
                activeCue ? findTranslationOf(activeCue, translationCues) : null
              }
              display={props.subtitleDisplay}
              isRaised={showsControls}
              activeWord={props.activeWord}
              onWordHover={(word) =>
                activeCue && props.onWordHover(word, activeCue)
              }
              onWordClick={(word) =>
                activeCue && props.onWordClick(word, activeCue)
              }
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
          {!panels.distractionFree && panels.waveform && props.waveform && (
            <div className="relative border-t border-line bg-surface px-3 py-2">
              {props.waveform}
              <span className="absolute right-4 bottom-3">
                <IconButton
                  label="Hide the waveform"
                  className="size-6 bg-black/50"
                  onClick={props.playerCallbacks.onToggleWaveform}
                >
                  <ChevronDown className="size-3.5" />
                </IconButton>
              </span>
            </div>
          )}
          {!panels.distractionFree && !panels.waveform && props.waveform && (
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

function Header({ title, language, onBack }: MediaViewProps) {
  const { openSettings } = useNavigationActions();
  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2">
      <Button variant="subtle" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden />
        Project
      </Button>
      <h1 className="min-w-0 flex-1 truncate font-medium">{title}</h1>
      {language && <Badge>{languageName(language)}</Badge>}
      <IconButton label="Settings" onClick={openSettings}>
        <Settings className="size-4" />
      </IconButton>
    </header>
  );
}
