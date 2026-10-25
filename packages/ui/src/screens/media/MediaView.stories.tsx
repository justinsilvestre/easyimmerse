import type { Cue } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Music } from "lucide-react";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { expect, fn, waitFor } from "storybook/test";
import { INITIAL_VIEWPORTS } from "storybook/viewport";
import { CuePanel } from "../../components/cuePanel/CuePanel.tsx";
import type { CueWordGestures } from "../../components/cuePanel/cueWordGestures.ts";
import { AnchoredPopup } from "../../components/dictionaryPopup/AnchoredPopup.tsx";
import { DictionaryPopup } from "../../components/dictionaryPopup/DictionaryPopup.tsx";
import { exampleResults } from "../../components/dictionaryPopup/exampleLookup.ts";
import { resolveExampleMediaUrl } from "../../components/dictionaryPopup/exampleMedia.ts";
import type { LookupDisplayState } from "../../components/dictionaryPopup/lookupDisplayState.ts";
import type { PopupSize } from "../../components/dictionaryPopup/popupSize.ts";
import { FlashcardEditor } from "../../components/flashcardEditor/FlashcardEditor.tsx";
import {
  exampleFlashcard,
  exampleLanguages,
  exampleScreenshotUrl,
} from "../../components/flashcards/exampleFlashcard.ts";
import { LibraryEditingBar } from "../../components/libraryEditing/LibraryEditingBar.tsx";
import { defaultSubtitleAppearance } from "../../components/subtitleAppearance/subtitleAppearance.ts";
import {
  exampleWaveformWindows,
  windowStartsUpTo,
} from "../../components/waveform/exampleWaveformWindows.ts";
import type { FlashcardSegment } from "../../components/waveform/flashcardSegment.ts";
import { WaveformStrip } from "../../components/waveform/WaveformStrip.tsx";
import type { Range } from "../../components/wordLookup/RunText.tsx";
import type { WordHit } from "../../components/wordLookup/useWordGestures.ts";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { fieldsOfPreset } from "../projectSettings/flashcardPresets.ts";
import {
  exampleCues,
  exampleFlashcardCueIndexes,
  exampleFlashcardWordRanges,
  exampleTranslationCues,
} from "./exampleCues.ts";
import { generateExamplePeaks } from "./examplePeaks.ts";
import { MediaView } from "./MediaView.tsx";
import {
  type PlayerCallbacks,
  PlayerControls,
  type PlayerPanelsState,
} from "./PlayerControls.tsx";
import type { PlayerControlsState } from "./PlayerControlsState.ts";
import { SubtitleTrackBar } from "./SubtitleTrackBar.tsx";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";

const tracks: SubtitleTrackChoices = {
  subtitles: [
    {
      id: "s1",
      label: "German",
      language: "de",
      sample: "Hast du das Licht gesehen?",
    },
    {
      id: "s2",
      label: "English",
      language: "en",
      sample: "Did you see the light?",
    },
  ],
  targetSubtitlesId: "s1",
  translationSubtitlesId: "s2",
};

const durationMs = 24_000;

const peaks = generateExamplePeaks(240);

const waveformWindows = exampleWaveformWindows(windowStartsUpTo(durationMs));

const flashcardSegments: FlashcardSegment[] = exampleCues
  .filter((cue) => exampleFlashcardCueIndexes.includes(cue.index))
  .map((cue) => ({
    id: String(cue.index),
    startMs: cue.start_ms,
    endMs: cue.end_ms,
    screenshotMs: (cue.start_ms + cue.end_ms) / 2,
  }));

const longFileCueCount = 340;

const longFileDurationMs = longFileCueCount * 4_000;

/** The example scene repeated through an episode's length, each cue numbered so that the list can be told apart. */
function repeatCues(cues: readonly Cue[]): Cue[] {
  return Array.from({ length: longFileCueCount }, (_, position) => {
    const example = cues[position % cues.length] as Cue;
    return {
      index: position + 1,
      start_ms: position * 4_000 + 500,
      end_ms: position * 4_000 + 3_500,
      text: `${position + 1}. ${example.text}`,
    };
  });
}

const longFileCues = repeatCues(exampleCues);

const longFileTranslationCues = repeatCues(exampleTranslationCues);

function videoStage() {
  return (
    <video
      src="fixtures/sample.mp4"
      preload="metadata"
      className="h-full w-full object-contain"
      aria-label="Dark S01E01 - Geheimnisse.mkv"
    >
      <track kind="captions" />
    </video>
  );
}

function audioStage(title: string) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="flex size-56 items-center justify-center rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-xl">
        <Music className="size-20 text-gray-400" aria-hidden />
      </div>
      <p className="text-lg text-fg-muted">{title}</p>
    </div>
  );
}

/** The strip as the media screen frames it, with synthetic peaks in place of the server's. */
function waveform(cues: readonly Cue[] = exampleCues) {
  return (
    <div className="border-t border-line bg-surface px-3 py-2">
      <WaveformStrip
        durationMs={durationMs}
        currentTimeMs={6_200}
        windows={waveformWindows}
        cues={cues}
        flashcardSegments={cues.length > 0 ? flashcardSegments : []}
        visibleSpanMs={durationMs}
        onSeek={fn()}
        onOpenFlashcardSegment={fn()}
        onClipEndpointMoved={fn()}
        onScreenshotMarkerMoved={fn()}
        onVisibleSpanChange={fn()}
      />
    </div>
  );
}

function subtitlesPanel(
  cues: readonly Cue[] = exampleCues,
  translationCues: readonly Cue[] = exampleTranslationCues,
  wordGestures: CueWordGestures = {
    onWordClick: fn(),
    onWordDoubleClick: fn(),
  },
) {
  return (
    <>
      <SubtitleTrackBar
        tracks={tracks}
        languages={{ target: "de", translation: "en" }}
        onTargetChange={fn()}
        onTranslationChange={fn()}
        onAddFile={fn()}
      />
      <CuePanel
        cues={cues}
        translationCues={translationCues}
        activeCueIndex={3}
        flashcardCueIndexes={exampleFlashcardCueIndexes}
        flashcardWordRanges={exampleFlashcardWordRanges}
        onSeek={fn()}
        onOpenFlashcardForCue={fn()}
        wordGestures={wordGestures}
        onAddSubtitlesFile={fn()}
        onGenerateSubtitles={fn()}
      />
    </>
  );
}

function lookupPopup(
  state: LookupDisplayState | null,
  mode: "word" | "search",
  forLearners?: ComponentProps<typeof DictionaryPopup>["forLearners"],
) {
  return (
    <AnchoredPopup anchor={null}>
      <DictionaryPopup
        state={state}
        mode={mode}
        resolveMediaUrl={resolveExampleMediaUrl}
        onSearch={fn()}
        onCreateFlashcard={fn()}
        onClose={fn()}
        onSetUpDictionary={fn()}
        forLearners={forLearners}
      />
    </AnchoredPopup>
  );
}

/** The subtitles panel of a library item its manager prepares, with the track choice and the words given as marked. */
function libraryPanel(
  marked: ReadonlyMap<number, readonly Range[]>,
  cues: readonly Cue[] = exampleCues,
  shownTracks: SubtitleTrackChoices = tracks,
) {
  return (
    <>
      <SubtitleTrackBar
        tracks={shownTracks}
        languages={{ target: "de", translation: "en" }}
        onTargetChange={fn()}
        onTranslationChange={fn()}
        onAddFile={fn()}
      />
      <CuePanel
        cues={cues}
        translationCues={cues.length > 0 ? exampleTranslationCues : []}
        activeCueIndex={3}
        flashcardCueIndexes={[]}
        flashcardWordRanges={marked}
        markedTitle="Has an entry for learners"
        onSeek={fn()}
        wordGestures={{ onWordClick: fn() }}
        onAddSubtitlesFile={fn()}
        onGenerateSubtitles={fn()}
      />
    </>
  );
}

const playerCallbacks: PlayerCallbacks = {
  onTogglePlay: fn(),
  onSeek: fn(),
  onSkip: fn(),
  onVolumeChange: fn(),
  onSpeedChange: fn(),
  onToggleSubtitleDisplay: fn(),
  onToggleSubtitles: fn(),
  onOpenSubtitleAppearance: fn(),
  onToggleCuePanel: fn(),
  onToggleWaveform: fn(),
  onToggleMute: fn(),
  onToggleFullscreen: fn(),
};

const pausedPlayback: PlayerControlsState = {
  isPlaying: false,
  currentMs: 6_200,
  durationMs,
  volume: 0.8,
  speed: 1,
};

const panels: PlayerPanelsState = { cues: true, waveform: false };

/** The control bar over the bottom of the stage, which the media screen connects to the store. */
function controls(
  playback: PlayerControlsState,
  shownPanels: PlayerPanelsState = panels,
  callbacks: PlayerCallbacks = playerCallbacks,
) {
  return (
    <PlayerControls
      playback={playback}
      tracks={tracks}
      panels={shownPanels}
      callbacks={callbacks}
    />
  );
}

const meta = {
  title: "Screens/Media/MediaView",
  component: MediaView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    media: {
      projectName: "German series",
      title: "Dark S01E01 - Geheimnisse.mkv",
      source: null,
    },
    stage: videoStage(),
    isPlaying: false,
    controls: controls(pausedPlayback),
    cues: exampleCues,
    translationCues: exampleTranslationCues,
    shownCue: exampleCues[2] ?? null,
    waveform: waveform(),
    panels,
    subtitleDisplay: "both",
    subtitleAppearance: defaultSubtitleAppearance,
    onSubtitleAppearanceChange: fn(),
    onCloseSubtitleAppearance: fn(),
    flashcardWordRanges: exampleFlashcardWordRanges,
    playerCallbacks,
    onBack: fn(),
    wordGestures: {
      onWordClick: fn(),
      onWordDoubleClick: fn(),
      onWordHold: fn(),
    },
    onLookup: fn(),
    onAddFlashcard: fn(),
    sidePanel: subtitlesPanel(),
  },
} satisfies Meta<typeof MediaView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VideoWithDualSubtitles: Story = {};

/**
 * A large phone, where the subtitles and controls sit under the picture at the top of the screen,
 * and the subtitles panel takes the rest of the height.
 */
export const ImportedThroughAPlugin: Story = {
  args: {
    media: {
      projectName: "German series",
      title: "Eine Stadtführung durch die Altstadt",
      source: { title: "Example plugin", isAvailable: true },
    },
  },
};

export const ImportedThroughAMissingPlugin: Story = {
  args: {
    media: {
      projectName: "German series",
      title: "Eine Stadtführung durch die Altstadt",
      source: { title: "example-plugin", isAvailable: false },
    },
  },
};

export const OnAPhone: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** A phone 375 px wide, the narrowest the control bar must fit on one row, here with the Tracks button as well. */
export const OnASmallPhone: Story = {
  parameters: { viewport: { options: INITIAL_VIEWPORTS } },
  globals: { viewport: { value: "iphonex", isRotated: false } },
  args: {
    controls: controls(pausedPlayback, panels, {
      ...playerCallbacks,
      onOpenTracks: fn(),
    }),
    playerCallbacks: { ...playerCallbacks, onOpenTracks: fn() },
  },
};

/** A window too short for the subtitles to sit under the picture, so that they lie over its lower edge. */
export const OnAShortWideWindow: Story = {
  parameters: {
    viewport: {
      options: {
        shortWide: {
          name: "Short, wide window",
          styles: { width: "830px", height: "420px" },
        },
      },
    },
  },
  globals: { viewport: { value: "shortWide", isRotated: false } },
};

/** Fullscreen while paused, with the footer laid under the controls at the bottom of the stage. */
export const InFullscreen: Story = {
  args: {
    panels: { ...panels, isFullscreen: true },
    controls: controls(pausedPlayback, { ...panels, isFullscreen: true }),
  },
};

/** Fullscreen during playback, where the header, controls and footer fold away once the pointer rests. */
export const InFullscreenWhilePlaying: Story = {
  args: {
    panels: { ...panels, isFullscreen: true },
    isPlaying: true,
    controls: controls(
      { ...pausedPlayback, isPlaying: true },
      { ...panels, isFullscreen: true },
    ),
  },
  // Waits until the pointer counts as resting, so that the story always settles with the chrome folded away.
  play: async ({ canvas }) => {
    const back = canvas.getByRole("button", { name: /^Back to/ });
    await waitFor(() => expect(back).not.toBeVisible(), { timeout: 5000 });
  },
};

/** A cue longer than the two lines the subtitle box keeps room for, which grows upward over the picture. */
export const FourLineCue: Story = {
  args: {
    shownCue: {
      index: 3,
      start_ms: 5400,
      end_ms: 8200,
      text: "Der Hund will fressen.\nEr hat Hunger.\nGib ihm etwas,\nbevor er bellt.",
    },
  },
};

export const SubtitlesHidden: Story = {
  args: {
    panels: { ...panels, areSubtitlesHidden: true },
    controls: controls(pausedPlayback, { ...panels, areSubtitlesHidden: true }),
  },
};

/** Yellow text with a heavy shadow and no background, as the appearance dialog can set. */
export const CustomSubtitleAppearance: Story = {
  args: {
    subtitleAppearance: {
      ...defaultSubtitleAppearance,
      backgroundOpacity: 0,
      textShadow: "heavy",
      textColor: "yellow",
      textSizeStep: 3,
    },
  },
};

export const ChangingSubtitleAppearance: Story = {
  args: { isSubtitleAppearanceOpen: true },
};

export const LookingUpAWord: Story = {
  args: {
    activeWord: { cueIndex: 3, start: 13, popupId: "dictionary" },
    lookup: lookupPopup(
      { kind: "found", term: "fressen", results: exampleResults },
      "word",
    ),
  },
};

export const LookupWithoutDictionary: Story = {
  args: {
    lookup: lookupPopup({ kind: "noDictionary", language: "de" }, "word"),
  },
};

export const SearchingForAWord: Story = {
  args: { lookup: lookupPopup(null, "search") },
};

export const EditingAFlashcard: Story = {
  args: {
    sidePanel: (
      <FlashcardEditor
        state={{
          content: exampleFlashcard,
          includedFields: fieldsOfPreset("intermediate"),
        }}
        dispatch={fn()}
        languages={exampleLanguages}
        waveform={{ peaks, durationMs }}
        screenshotUrl={exampleScreenshotUrl}
        onSave={fn()}
        onDelete={fn()}
        onClose={fn()}
        onPlayClip={fn()}
      />
    ),
  },
};

export const NoSubtitles: Story = {
  args: {
    cues: [],
    translationCues: [],
    shownCue: null,
    waveform: waveform([]),
    controls: (
      <PlayerControls
        playback={pausedPlayback}
        tracks={{
          subtitles: [],
          targetSubtitlesId: null,
          translationSubtitlesId: null,
        }}
        panels={panels}
        callbacks={playerCallbacks}
      />
    ),
    sidePanel: subtitlesPanel([], []),
  },
};

export const AudioWithTranscript: Story = {
  args: {
    media: {
      projectName: "German series",
      title: "Die Verwandlung, Kapitel 1",
      source: null,
    },
    stage: audioStage("Die Verwandlung, Kapitel 1"),
    translationCues: [],
    sidePanel: subtitlesPanel(exampleCues, []),
  },
};

export const Playing: Story = {
  args: {
    isPlaying: true,
    controls: controls({ ...pausedPlayback, isPlaying: true }),
  },
};

export const WaveformShown: Story = {
  args: { panels: { cues: true, waveform: true } },
};

/** A whole episode, whose subtitles panel must scroll on its own while the screen stays the size of the window. */
export const LongFile: Story = {
  args: {
    cues: longFileCues,
    translationCues: longFileTranslationCues,
    shownCue: longFileCues[1] ?? null,
    controls: controls({ ...pausedPlayback, durationMs: longFileDurationMs }),
    sidePanel: subtitlesPanel(longFileCues, longFileTranslationCues),
  },
};

/**
 * The media screen with the pop-up standing at a word of the subtitles panel, at first the word "Hund" of the current cue,
 * and then at whichever word is clicked there.
 */
function LookupInSubtitlesPanel({
  view,
  initialSize,
}: {
  view: ComponentProps<typeof MediaView>;
  initialSize: PopupSize;
}) {
  const [word, setWord] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState(initialSize);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => setWord(currentHund(panelRef.current)), []);
  const wordGestures = useMemo(
    () => ({ onWordClick: ({ element }: WordHit) => setWord(element) }),
    [],
  );
  return (
    <MediaView
      {...view}
      sidePanel={
        <div ref={panelRef} className="contents">
          {subtitlesPanel(exampleCues, exampleTranslationCues, wordGestures)}
        </div>
      }
      lookup={
        word && (
          <AnchoredPopup anchor={{ elementId: word.id }} size={size}>
            <DictionaryPopup
              state={{ kind: "found", term: "Hund", results: exampleResults }}
              mode="word"
              size={size}
              resolveMediaUrl={resolveExampleMediaUrl}
              onSearch={fn()}
              onCreateFlashcard={fn()}
              onToggleSize={() =>
                setSize(size === "compact" ? "expanded" : "compact")
              }
              onClose={() => setWord(null)}
              onSetUpDictionary={fn()}
            />
          </AnchoredPopup>
        )
      }
    />
  );
}

function currentHund(panel: HTMLElement | null): HTMLElement | null {
  const words = panel?.querySelectorAll<HTMLElement>("[data-clickable-word]");
  return [...(words ?? [])].find((word) => word.textContent === "Hund") ?? null;
}

/** A word looked up in the subtitles panel, with the pop-up beside it over the panel. */
export const LookingUpAWordInTheSubtitlesPanel: Story = {
  render: (args) => (
    <LookupInSubtitlesPanel view={args} initialSize="compact" />
  ),
};

/** The same pop-up expanded, spanning the window's height over the word and the panel. */
export const ExpandedLookupInTheSubtitlesPanel: Story = {
  render: (args) => (
    <LookupInSubtitlesPanel view={args} initialSize="expanded" />
  ),
};

/**
 * A library manager preparing a new item in the player, just after adding its video: it has no subtitles yet,
 * so the subtitles panel offers to add a subtitles file or to generate subtitles.
 */
export const PreparingANewLibraryItem: Story = {
  args: {
    media: { projectName: "Item details", title: "park.mp4", source: null },
    headerContent: (
      <LibraryEditingBar
        title="Im Park"
        kind="subtitles"
        onOpenDetails={fn()}
      />
    ),
    markedWordTitle: "Has an entry for learners",
    onAddFlashcard: undefined,
    cues: [],
    translationCues: [],
    shownCue: null,
    sidePanel: libraryPanel(new Map(), [], {
      subtitles: [],
      targetSubtitlesId: null,
      translationSubtitlesId: null,
    }),
  },
};

/**
 * A library manager preparing an item in the player: the subtitles panel chooses its subtitles and their translation,
 * every word can be clicked, the words with an entry for learners are underlined, and the pop-up gives the text chosen an entry for learners.
 */
export const PreparingALibraryItem: Story = {
  args: {
    media: { projectName: "Item details", title: "Im Park", source: null },
    headerContent: (
      <LibraryEditingBar
        title="park.mp4"
        kind="subtitles"
        onOpenDetails={fn()}
      />
    ),
    markedWordTitle: "Has an entry for learners",
    onAddFlashcard: undefined,
    sidePanel: libraryPanel(exampleFlashcardWordRanges),
    activeWord: { cueIndex: 3, start: 13, popupId: "dictionary" },
    lookup: lookupPopup(
      { kind: "found", term: "fressen", results: exampleResults },
      "word",
      { stored: null, onRemove: fn(), onApplyEverywhere: fn() },
    ),
  },
};
