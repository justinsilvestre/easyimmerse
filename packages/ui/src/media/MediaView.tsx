import type { Cue } from "@easyimmerse/types";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { type PointerEvent, type ReactNode, type Ref, useRef } from "react";
import { AppFooter } from "../components/AppFooter.tsx";
import { Button } from "../components/Button.tsx";
import type { LineStep } from "../components/cursorKeys.ts";
import type { Range } from "../components/RunText.tsx";
import { useElementSize } from "../hooks/useElementSize.ts";
import { usePointerActivity } from "../hooks/usePointerActivity.ts";
import type { CueTextCursor } from "./cueCursor.ts";
import type { ActiveCueWord, CueWordGestures } from "./cueWordGestures.ts";
import { findTranslationOf } from "./findCue.ts";
import { PanelToggles } from "./PanelToggles.tsx";
import {
  type PlayerCallbacks,
  PlayerControls,
  type PlayerPanelsState,
} from "./PlayerControls.tsx";
import type { PlayerControlsState } from "./PlayerControlsState.ts";
import { SubtitleAppearanceDialog } from "./SubtitleAppearanceDialog.tsx";
import { SubtitleBand } from "./SubtitleBand.tsx";
import { SubtitleLookupButtons } from "./SubtitleLookupButtons.tsx";
import { type SubtitleDisplay, SubtitleOverlay } from "./SubtitleOverlay.tsx";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";
import type { SubtitleAppearance } from "./subtitleAppearance.ts";
import {
  pictureHeightAt,
  subtitleBandPlacement,
} from "./subtitleBandPlacement.ts";
import { usePictureAspectRatio } from "./usePictureAspectRatio.ts";
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
  /** The cue the subtitles over the stage show. */
  shownCue: Cue | null;
  /** The waveform strip under the stage, shown while the waveform panel is open. */
  waveform: ReactNode;
  panels: PlayerPanelsState;
  subtitleDisplay: SubtitleDisplay;
  subtitleAppearance: SubtitleAppearance;
  /** Shows the dialog where the user sets the subtitles' appearance, which the Subtitle options menu opens. */
  isSubtitleAppearanceOpen?: boolean;
  onSubtitleAppearanceChange: (appearance: SubtitleAppearance) => void;
  onCloseSubtitleAppearance: () => void;
  /** Where each cue's text holds the words that flashcards were made from, by cue index. */
  flashcardWordRanges?: ReadonlyMap<number, readonly Range[]>;
  /** The word the dictionary pop-up shows, which is highlighted in the subtitles. */
  activeWord?: ActiveCueWord;
  /** The lookup cursor of the subtitles, which is highlighted in them; null when there is none. */
  cursor?: CueTextCursor | null;
  playerCallbacks: PlayerCallbacks;
  onBack: () => void;
  /** What the user does to the words of the subtitles over the stage. */
  wordGestures: CueWordGestures;
  /** Moves from a cue of the subtitles over the stage to the previous or next one; it must keep its identity across renders. */
  onCueStep?: (cue: Cue, step: LineStep) => void;
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
 * The header lies over the top of the stage.
 * The subtitles sit in a box across the stage, right above the controls, with the lookup buttons over the box's right end.
 * Subtitles and controls form one band, which takes rows of its own under the picture when the stage has room for it there,
 * and otherwise lies over the picture's lower edge, so that a short, wide stage does not shrink the picture.
 * When the side panel sits under the stage, the stage is only as tall as the picture and the band need, and the panel takes the rest.
 * The header, controls and lookup buttons show while playback is paused or the pointer moves over the picture,
 * and fold away otherwise, taking the pointer with them.
 * Moving over the subtitles or the pop-up does not count, and a pause the open pop-up caused does not bring them back,
 * so that looking words up with the mouse leaves the picture clear.
 * The controls keep their place while hidden, so the subtitles above them never move.
 * A click on the picture plays or pauses, and a double-click fills the screen or leaves it.
 * The toggles for the panels around the stage and for fullscreen sit in the app footer, which stays in fullscreen.
 * On a phone with a notch or a home indicator, the screen keeps clear of them.
 * The panels around the stage come in as children, so that each can be wired to the store on its own.
 */
export function MediaView(props: MediaViewProps) {
  const { playback, cues, translationCues, shownCue, panels } = props;
  const pointer = usePointerActivity();
  const onStageClick = useStageClicks(
    props.playerCallbacks.onTogglePlay,
    props.playerCallbacks.onToggleFullscreen,
  );
  const isPausedByUser = !playback.isPlaying && props.lookup == null;
  const showsChrome = isPausedByUser || pointer.isActive;
  const showsSubtitles =
    !panels.areSubtitlesHidden &&
    (cues.length > 0 || translationCues.length > 0);
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!isOverLookupSurface(event)) pointer.onPointerMove(event);
  };
  const layout = useStageLayout();
  return (
    <div
      ref={props.ref}
      className="flex h-dvh flex-col overflow-hidden bg-canvas pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-fg"
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main
          className={clsx(
            "flex min-h-0 min-w-0 flex-col md:flex-1",
            props.sidePanel == null && "flex-1",
          )}
        >
          {props.headerContent && (
            <div className="border-b border-line px-3 py-2">
              {props.headerContent}
            </div>
          )}
          {/* The pop-up is a sibling of the dark stage, positioned against this frame, so that it follows the app theme. */}
          <div
            className="relative flex min-h-40 shrink grow flex-col"
            style={{ flexBasis: layout.stageBasis }}
          >
            <div
              ref={layout.stageRef}
              data-theme="dark"
              className={clsx(
                "@container relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black",
                !showsChrome && "cursor-none",
              )}
              onPointerMove={onPointerMove}
            >
              {/* Space and K play and pause, and F fills the screen, from the keyboard; the clicks are the pointer's way to do the same. */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: see above */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: see above */}
              <div
                ref={layout.pictureRef}
                className="flex min-h-0 w-full shrink grow items-center justify-center"
                style={{ flexBasis: layout.pictureBasis }}
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
              <SubtitleBand
                ref={layout.bandRef}
                placement={layout.placement}
                appearance={showsSubtitles ? props.subtitleAppearance : null}
              >
                <div className="relative">
                  <Fading
                    isShown={showsChrome}
                    className="absolute right-2 bottom-full mb-2"
                  >
                    <SubtitleLookupButtons
                      onLookup={props.onLookup}
                      onAddFlashcard={props.onAddFlashcard}
                    />
                  </Fading>
                  {showsSubtitles && (
                    <div {...{ [lookupSurfaceAttribute]: "" }}>
                      <SubtitleOverlay
                        targetCue={shownCue}
                        translationCue={
                          shownCue
                            ? findTranslationOf(shownCue, translationCues)
                            : null
                        }
                        display={shownDisplay(
                          props.subtitleDisplay,
                          cues.length > 0,
                          translationCues.length > 0,
                        )}
                        appearance={props.subtitleAppearance}
                        flashcardWordRanges={
                          shownCue
                            ? props.flashcardWordRanges?.get(shownCue.index)
                            : undefined
                        }
                        activeWord={props.activeWord}
                        cursor={props.cursor}
                        wordGestures={props.wordGestures}
                        onCueStep={props.onCueStep}
                      />
                    </div>
                  )}
                </div>
                <Fading isShown={showsChrome}>
                  <PlayerControls
                    playback={playback}
                    tracks={props.tracks}
                    panels={panels}
                    callbacks={props.playerCallbacks}
                  />
                </Fading>
              </SubtitleBand>
            </div>
            {props.lookup}
          </div>
          {panels.waveform && props.waveform}
        </main>
        {props.sidePanel != null && (
          <aside className="flex min-h-[40dvh] flex-1 flex-col overflow-hidden border-t border-line bg-canvas md:h-full md:min-h-0 md:w-96 md:flex-none md:border-t-0 md:border-l">
            {props.sidePanel}
          </aside>
        )}
      </div>
      <AppFooter>
        <PanelToggles panels={panels} callbacks={props.playerCallbacks} />
      </AppFooter>
      {props.isSubtitleAppearanceOpen && (
        <SubtitleAppearanceDialog
          appearance={props.subtitleAppearance}
          onChange={props.onSubtitleAppearanceChange}
          onClose={props.onCloseSubtitleAppearance}
        />
      )}
    </div>
  );
}

/**
 * Measures the stage, the picture's proportions and the band of subtitles and controls, and lays them out:
 * where the band goes, and how tall the picture and the stage would be with the picture as wide as the stage.
 * Those natural heights let the stage fit its content when the side panel sits under it.
 * They do not depend on where the band goes, so that the placement cannot change the measurements it was made from.
 */
function useStageLayout() {
  const stageRef = useRef<HTMLDivElement>(null);
  const pictureRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const stage = useElementSize(stageRef);
  const band = useElementSize(bandRef);
  const aspectRatio = usePictureAspectRatio(pictureRef);
  const pictureHeight =
    aspectRatio === null ? null : pictureHeightAt(stage.width, aspectRatio);
  return {
    stageRef,
    pictureRef,
    bandRef,
    placement: subtitleBandPlacement(stage, aspectRatio, band.height),
    pictureBasis: pictureHeight ?? "auto",
    stageBasis: pictureHeight === null ? "auto" : pictureHeight + band.height,
  };
}

/** The subtitles to show of those the user chose, leaving out a language that has no subtitles. */
function shownDisplay(
  display: SubtitleDisplay,
  hasTarget: boolean,
  hasTranslation: boolean,
): SubtitleDisplay {
  if (display !== "both" || (hasTarget && hasTranslation)) return display;
  return hasTarget ? "target" : "translation";
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
