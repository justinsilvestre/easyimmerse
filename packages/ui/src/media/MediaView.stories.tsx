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
import { fn } from "storybook/test";
import { INITIAL_VIEWPORTS } from "storybook/viewport";
import type { WordHit } from "../components/useWordGestures.ts";
import {
  exampleWaveformWindows,
  windowStartsUpTo,
} from "../components/waveform/exampleWaveformWindows.ts";
import type { FlashcardSegment } from "../components/waveform/flashcardSegment.ts";
import { WaveformStrip } from "../components/waveform/WaveformStrip.tsx";
import {
  exampleFlashcard,
  exampleLanguages,
  exampleScreenshotUrl,
} from "../flashcards/exampleFlashcard.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { UnsavedWorkBanner } from "../flashcards/UnsavedWorkBanner.tsx";
import { AnchoredPopup } from "../lookup/AnchoredPopup.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { resolveExampleMediaUrl } from "../lookup/exampleMedia.ts";
import type { LookupState } from "../lookup/lookupState.ts";
import type { PopupSize } from "../lookup/popupSize.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { CuePanel } from "./CuePanel.tsx";
import type { CueWordGestures } from "./cueWordGestures.ts";
import {
  exampleCues,
  exampleFlashcardCueIndexes,
  exampleFlashcardWordRanges,
  exampleTranslationCues,
} from "./exampleCues.ts";
import { generateExamplePeaks } from "./examplePeaks.ts";
import { MediaView } from "./MediaView.tsx";
import { SubtitleTrackBar } from "./SubtitleTrackBar.tsx";
import type { SubtitleTrackChoices } from "./SubtitleTrackChoices.ts";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";

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

function lookupPopup(state: LookupState | null, mode: "word" | "search") {
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
      />
    </AnchoredPopup>
  );
}

const meta = {
  title: "Media/MediaView",
  component: MediaView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    media: {
      projectName: "German series",
      title: "Dark S01E01 - Geheimnisse.mkv",
    },
    stage: videoStage(),
    playback: {
      isPlaying: false,
      currentMs: 6_200,
      durationMs,
      volume: 0.8,
      speed: 1,
    },
    tracks,
    cues: exampleCues,
    translationCues: exampleTranslationCues,
    shownCue: exampleCues[2] ?? null,
    waveform: waveform(),
    panels: { cues: true, waveform: false },
    subtitleDisplay: "both",
    subtitleAppearance: defaultSubtitleAppearance,
    onSubtitleAppearanceChange: fn(),
    onCloseSubtitleAppearance: fn(),
    flashcardWordRanges: exampleFlashcardWordRanges,
    playerCallbacks: {
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
    },
    onBack: fn(),
    wordGestures: {
      onWordClick: fn(),
      onWordDoubleClick: fn(),
      onWordHoverAnswered: fn(),
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

/** A large phone, where the subtitle box spans the narrow stage under the lookup buttons. */
export const OnAPhone: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** A phone 375 px wide, the narrowest the control bar must fit on one row, here with the Tracks button as well. */
export const OnASmallPhone: Story = {
  parameters: { viewport: { options: INITIAL_VIEWPORTS } },
  globals: { viewport: { value: "iphonex", isRotated: false } },
  args: {
    playerCallbacks: { ...meta.args.playerCallbacks, onOpenTracks: fn() },
  },
};

export const SubtitlesHidden: Story = {
  args: {
    panels: { cues: true, waveform: false, areSubtitlesHidden: true },
  },
};

/** Yellow text with a strong shadow and no box, as the appearance dialog can set. */
export const CustomSubtitleAppearance: Story = {
  args: {
    subtitleAppearance: {
      ...defaultSubtitleAppearance,
      boxOpacity: 0,
      textShadow: "strong",
      textColor: "yellow",
      textSizeStep: 4,
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
    headerContent: (
      <UnsavedWorkBanner
        hasUnsavedChanges
        isBackedUp={false}
        onSave={fn()}
        onLogIn={fn()}
      />
    ),
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
    tracks: {
      subtitles: [],
      targetSubtitlesId: null,
      translationSubtitlesId: null,
    },
    sidePanel: subtitlesPanel([], []),
  },
};

export const AudioWithTranscript: Story = {
  args: {
    media: {
      projectName: "German series",
      title: "Die Verwandlung, Kapitel 1",
    },
    stage: audioStage("Die Verwandlung, Kapitel 1"),
    translationCues: [],
    sidePanel: subtitlesPanel(exampleCues, []),
  },
};

export const Playing: Story = {
  args: {
    playback: {
      isPlaying: true,
      currentMs: 6_200,
      durationMs,
      volume: 0.8,
      speed: 1,
    },
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
    playback: {
      isPlaying: false,
      currentMs: 6_200,
      durationMs: longFileDurationMs,
      volume: 0.8,
      speed: 1,
    },
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
          <AnchoredPopup anchor={word} size={size}>
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
