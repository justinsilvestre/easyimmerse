import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { ArrowLeft, ChevronUp, Search } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { AppFooter } from "../components/AppFooter.tsx";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { lookupTriggerAttribute } from "../components/lookupTrigger.ts";
import { NewFlashcardIcon } from "../flashcards/NewFlashcardIcon.tsx";
import { usePointerActivity } from "../hooks/usePointerActivity.ts";
import { languageName } from "../projects/languages.ts";
import type { ActiveCueWord, CueWordGestures } from "./cueWordGestures.ts";
import { findCueAt, findTranslationOf } from "./findCue.ts";
import {
  type PlayerCallbacks,
  PlayerControls,
  type PlayerPanelsState,
} from "./PlayerControls.tsx";
import type { PlayerControlsState } from "./PlayerControlsState.ts";
import { type SubtitleDisplay, SubtitleOverlay } from "./SubtitleOverlay.tsx";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";

type MediaViewProps = {
  /** The screen's root element, which keyboard shortcuts check to tell whether the screen is in reach. */
  ref?: Ref<HTMLDivElement>;
  /** The file's name and language, and the name of the project it belongs to, which the way back is named after. */
  media: { title: string; language: string; projectName: string };
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

/**
 * The screen for watching or listening to one media file. It is dark in both themes, like a cinema.
 * The header lies over the top of the stage and the controls over its bottom, and both show only while the pointer moves or playback is paused;
 * in distraction-free mode the lookup buttons go with them and the pointer itself hides.
 * The subtitles sit just above the controls, centered when they fit, and give way to the lookup buttons beside them rather than run under them.
 * The footer holds the way to Settings and the theme menu, as on every other screen.
 * On a phone with a notch or a home indicator, the screen keeps clear of them.
 * The panels around the stage come in as children, so that each can be wired to the store on its own.
 */
export function MediaView(props: MediaViewProps) {
  const { playback, cues, translationCues, panels } = props;
  const activeCue = findCueAt(cues, playback.currentMs);
  const pointer = usePointerActivity();
  const showsChrome = !playback.isPlaying || pointer.isActive;
  const showsSidePanel = !panels.distractionFree && props.sidePanel != null;
  const hidesLookupButtons = panels.distractionFree && !showsChrome;
  return (
    <div
      ref={props.ref}
      data-theme="dark"
      className={clsx(
        "flex h-dvh flex-col bg-canvas pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-fg",
        hidesLookupButtons && "cursor-none",
      )}
      onPointerMove={pointer.onPointerMove}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {props.headerContent && (
            <div className="border-b border-line px-3 py-2">
              {props.headerContent}
            </div>
          )}
          <div className="relative flex min-h-40 flex-1 items-center justify-center overflow-hidden bg-black">
            {props.stage}
            {!panels.distractionFree && (
              <Collapsible isShown={showsChrome} className="top-0">
                <Header {...props} />
              </Collapsible>
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
                <span
                  className={clsx(
                    "flex items-center gap-1 justify-self-end rounded-md bg-black/50 transition-opacity",
                    hidesLookupButtons
                      ? "opacity-0 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100"
                      : "pointer-events-auto",
                  )}
                >
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
              </div>
              <Collapsible isShown={showsChrome}>
                <PlayerControls
                  playback={playback}
                  tracks={props.tracks}
                  panels={panels}
                  callbacks={props.playerCallbacks}
                />
              </Collapsible>
            </div>
            {props.lookup}
          </div>
          {panels.waveform && props.waveform}
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
          <aside className="flex max-h-[45dvh] min-h-0 shrink-0 flex-col border-t border-line bg-canvas md:max-h-none md:w-96 md:border-t-0 md:border-l">
            {props.sidePanel}
          </aside>
        )}
      </div>
      {!panels.distractionFree && <AppFooter settingsControl="icon" />}
    </div>
  );
}

/**
 * A bar over the stage that folds away when not wanted. A keyboard reaching into it unfolds it,
 * so that its controls can be tabbed to even while hidden. With `className` "top-0" it lies over the top of the stage;
 * otherwise it stacks in the flow of the overlay it is placed in.
 */
function Collapsible({
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
        "grid transition-[grid-template-rows,opacity] has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:grid-rows-[1fr] has-[:focus-visible]:opacity-100",
        isShown
          ? "pointer-events-auto grid-rows-[1fr]"
          : "pointer-events-none grid-rows-[0fr] opacity-0",
        className && `absolute inset-x-0 z-10 ${className}`,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** The bar over the top of the stage: the way back to the project, named after it, with the file's name and language. */
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
      <Badge>{languageName(media.language)}</Badge>
    </header>
  );
}
