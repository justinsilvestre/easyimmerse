import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { ArrowLeft, ChevronUp, Minimize, Search, Settings } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { Kbd } from "../components/Kbd.tsx";
import { lookupTriggerAttribute } from "../components/lookupTrigger.ts";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";
import { usePointerActivity } from "../hooks/usePointerActivity.ts";
import { useNavigationActions } from "../navigationContext.ts";
import { languageName } from "../projects/languages.ts";
import type { ActiveCueWord, CueWordGestures } from "./cueWordGestures.ts";
import { findCueAt, findTranslationOf } from "./findCue.ts";
import { type PlayerCallbacks, PlayerControls } from "./PlayerControls.tsx";
import type { PlayerControlsState } from "./PlayerControlsState.ts";
import { type SubtitleDisplay, SubtitleOverlay } from "./SubtitleOverlay.tsx";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";

type MediaViewProps = {
  /** The screen's root element, which keyboard shortcuts check to tell whether the screen is in reach. */
  ref?: Ref<HTMLDivElement>;
  media: { title: string; language: string };
  /** The player itself: the video, or the artwork of an audio file, with whatever precedes playback. */
  stage: ReactNode;
  playback: PlayerControlsState;
  tracks: SubtitleTrackChoices;
  cues: readonly Cue[];
  translationCues: readonly Cue[];
  /** The waveform strip under the stage, shown while the waveform panel is open. */
  waveform: ReactNode;
  panels: { cues: boolean; waveform: boolean; distractionFree: boolean };
  subtitleDisplay: SubtitleDisplay;
  /** The word the dictionary pop-up shows, which is highlighted in the subtitles. */
  activeWord?: ActiveCueWord;
  playerCallbacks: PlayerCallbacks;
  onBack: () => void;
  /** What the user does to the words of the subtitles over the stage. */
  wordGestures: CueWordGestures;
  onLookup: () => void;
  onAddFlashcard: () => void;
  /** Notices to show above the stage, such as the unsaved-work banner. */
  headerContent?: ReactNode;
  /** The dictionary pop-up, which places itself at its word or else over the lower part of the stage. */
  lookup?: ReactNode;
  /** The subtitles panel or the flashcard editor, docked beside the stage. */
  sidePanel?: ReactNode;
};

/**
 * The screen for watching or listening to one media file. It is dark in both themes, like a cinema.
 * The controls lie over the bottom of the stage and show only while the pointer moves or playback is paused.
 * The subtitles sit just above them, centered when they fit, and give way to the lookup buttons beside them rather than run under them.
 * On a phone with a notch or a home indicator, the screen keeps clear of them.
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
      ref={props.ref}
      data-theme="dark"
      className={clsx(
        "flex h-dvh flex-col bg-canvas pb-[env(safe-area-inset-bottom)] text-fg",
        panels.distractionFree && "pt-[env(safe-area-inset-top)]",
      )}
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 p-2">
                <div className="col-start-2 min-w-0">
                  <SubtitleOverlay
                    targetCue={activeCue}
                    translationCue={
                      activeCue
                        ? findTranslationOf(activeCue, translationCues)
                        : null
                    }
                    display={props.subtitleDisplay}
                    activeWord={props.activeWord}
                    wordGestures={props.wordGestures}
                  />
                </div>
                <span className="pointer-events-auto flex items-center gap-1 justify-self-end rounded-md bg-black/50">
                  <IconButton
                    label="Look up a word"
                    {...{ [lookupTriggerAttribute]: "" }}
                    onClick={props.onLookup}
                  >
                    <Search className="size-4" />
                  </IconButton>
                  <span className="hidden pointer-fine:inline">
                    <Kbd>L</Kbd>
                  </span>
                  <IconButton
                    label="New flashcard from this subtitle"
                    onClick={props.onAddFlashcard}
                  >
                    <NewFlashcardIcon className="size-4" />
                  </IconButton>
                </span>
              </div>
              <div
                className={clsx(
                  "grid transition-[grid-template-rows,opacity] focus-within:pointer-events-auto focus-within:grid-rows-[1fr] focus-within:opacity-100",
                  showsControls
                    ? "pointer-events-auto grid-rows-[1fr]"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <PlayerControls
                    playback={playback}
                    tracks={props.tracks}
                    panels={panels}
                    callbacks={props.playerCallbacks}
                  />
                </div>
              </div>
            </div>
            {props.lookup}
          </div>
          {!panels.distractionFree && panels.waveform && props.waveform}
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

/** The bar above the stage. The screen has no footer, so the way to Settings is here. */
function Header({ media, onBack }: MediaViewProps) {
  const { openSettings } = useNavigationActions();
  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
      <Button variant="subtle" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden />
        Project
      </Button>
      <h1 className="min-w-0 flex-1 truncate font-medium">{media.title}</h1>
      <Badge>{languageName(media.language)}</Badge>
      <IconButton label="Settings" onClick={openSettings}>
        <Settings className="size-4" />
      </IconButton>
    </header>
  );
}
