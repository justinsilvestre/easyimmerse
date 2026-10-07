import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { ArrowLeft, Search } from "lucide-react";
import type { PointerEvent, ReactNode, Ref } from "react";
import { AppFooter } from "../components/AppFooter.tsx";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { lookupTriggerAttribute } from "../components/lookupTrigger.ts";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";
import { usePointerActivity } from "../hooks/usePointerActivity.ts";
import type { ActiveCueWord, CueWordGestures } from "./cueWordGestures.ts";
import { findTranslationOf } from "./findCue.ts";
import { PanelToggles } from "./PanelToggles.tsx";
import {
  type PlayerCallbacks,
  PlayerControls,
  type PlayerPanelsState,
} from "./PlayerControls.tsx";
import type { PlayerControlsState } from "./PlayerControlsState.ts";
import { type SubtitleDisplay, SubtitleOverlay } from "./SubtitleOverlay.tsx";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";
import { useShownCue } from "./useShownCue.ts";
import { useStageClicks } from "./useStageClicks.ts";

type MediaViewProps = {
  /** The screen's root element, which keyboard shortcuts check to tell whether the screen is in reach. */
  ref?: Ref<HTMLDivElement>;
  /** The file's name, and the name of the project it belongs to, which the way back is named after. */
  media: { title: string; projectName: string };
  /** The player itself: the video, or the artwork of an audio file, with whatever precedes playback. */
  stage: ReactNode;
  playback: PlayerControlsState;
  tracks: SubtitleTrackChoices;
  cues: readonly Cue[];
  translationCues: readonly Cue[];
  /** The waveform strip under the stage, shown while the waveform panel is open. */
  waveform: ReactNode;
  panels: PlayerPanelsState;
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

/** Marks the subtitles, where the pointer goes to look words up, so that moving over them does not bring the chrome back. */
const lookupSurfaceAttribute = "data-lookup-surface";

/**
 * The screen for watching or listening to one media file.
 * The stage is dark in both themes, like a cinema, so that the bars laid over the picture stay readable;
 * the panels around it, the footer and the dictionary pop-up follow the app theme.
 * The header lies over the top of the stage and the controls over its bottom, with the lookup buttons beside the subtitles.
 * These show while playback is paused or the pointer moves over the picture, and fold away otherwise, taking the pointer with them.
 * Moving over the subtitles or the pop-up does not count, and a pause the open pop-up caused does not bring them back,
 * so that looking words up with the mouse leaves the picture clear.
 * The controls keep their place while hidden, so the subtitles above them never move.
 * A click on the picture plays or pauses, and a double-click fills the screen or leaves it.
 * The toggles for the panels around the stage and for fullscreen sit in the app footer, which stays in fullscreen.
 * On a phone with a notch or a home indicator, the screen keeps clear of them.
 * The panels around the stage come in as children, so that each can be wired to the store on its own.
 */
export function MediaView(props: MediaViewProps) {
  const { playback, cues, translationCues, panels } = props;
  const activeCue = useShownCue(cues, playback.currentMs);
  const pointer = usePointerActivity();
  const onStageClick = useStageClicks(
    props.playerCallbacks.onTogglePlay,
    props.playerCallbacks.onToggleFullscreen,
  );
  const isPausedByUser = !playback.isPlaying && props.lookup == null;
  const showsChrome = isPausedByUser || pointer.isActive;
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!isOverLookupSurface(event)) pointer.onPointerMove(event);
  };
  return (
    <div
      ref={props.ref}
      className="flex h-dvh flex-col overflow-hidden bg-canvas pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-fg"
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {props.headerContent && (
            <div className="border-b border-line px-3 py-2">
              {props.headerContent}
            </div>
          )}
          {/* The pop-up is a sibling of the dark stage, positioned against this frame, so that it follows the app theme. */}
          <div className="relative flex min-h-40 flex-1 flex-col">
            <div
              data-theme="dark"
              className={clsx(
                "@container relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black",
                !showsChrome && "cursor-none",
              )}
              onPointerMove={onPointerMove}
            >
              {/* Space and K play and pause, and F fills the screen, from the keyboard; the clicks are the pointer's way to do the same. */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: see above */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: see above */}
              <div
                className="flex h-full w-full items-center justify-center"
                onClick={onStageClick}
              >
                {props.stage}
              </div>
              <Fading
                isShown={showsChrome}
                className="absolute inset-x-0 top-0 z-10"
              >
                <Header {...props} />
              </Fading>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col">
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 p-2">
                  <div
                    className="col-start-2 min-w-0 cursor-auto"
                    {...{ [lookupSurfaceAttribute]: "" }}
                  >
                    {!panels.areSubtitlesHidden && (
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
                    )}
                  </div>
                  <Fading isShown={showsChrome} className="justify-self-end">
                    <span className="flex items-center gap-1 rounded-md bg-black/50">
                      <IconButton
                        label="Look up a word (L)"
                        {...{ [lookupTriggerAttribute]: "" }}
                        onClick={props.onLookup}
                      >
                        <Search className="size-4" />
                      </IconButton>
                      <IconButton
                        label="New flashcard from this subtitle"
                        onClick={props.onAddFlashcard}
                      >
                        <NewFlashcardIcon className="size-4" />
                      </IconButton>
                    </span>
                  </Fading>
                </div>
                <Fading isShown={showsChrome}>
                  <PlayerControls
                    playback={playback}
                    tracks={props.tracks}
                    panels={panels}
                    callbacks={props.playerCallbacks}
                  />
                </Fading>
              </div>
            </div>
            {props.lookup}
          </div>
          {panels.waveform && props.waveform}
        </main>
        {props.sidePanel != null && (
          <aside className="flex max-h-[45dvh] min-h-0 shrink-0 flex-col overflow-hidden border-t border-line bg-canvas md:h-full md:max-h-none md:w-96 md:border-t-0 md:border-l">
            {props.sidePanel}
          </aside>
        )}
      </div>
      <AppFooter>
        <PanelToggles panels={panels} callbacks={props.playerCallbacks} />
      </AppFooter>
    </div>
  );
}

function isOverLookupSurface(event: PointerEvent<HTMLElement>): boolean {
  const target = event.target as Element;
  return target.closest(`[${lookupSurfaceAttribute}]`) !== null;
}

/**
 * Part of the chrome, which fades away when not wanted while keeping its place.
 * A keyboard reaching into it brings it back, so that its controls can be tabbed to even while hidden.
 */
function Fading({
  isShown,
  className,
  children,
}: {
  isShown: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "transition-opacity has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100",
        isShown ? "pointer-events-auto" : "pointer-events-none opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The bar over the top of the stage: the way back to the project, named after it, and the file's name. */
function Header({ media, onBack }: MediaViewProps) {
  return (
    <header className="flex items-center gap-3 bg-surface/90 px-3 py-2 backdrop-blur-sm">
      <Button
        variant="subtle"
        aria-label={`Back to ${media.projectName}`}
        className="min-w-0 shrink"
        onClick={onBack}
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{media.projectName}</span>
      </Button>
      <h1 className="min-w-0 flex-1 truncate font-medium">{media.title}</h1>
    </header>
  );
}
