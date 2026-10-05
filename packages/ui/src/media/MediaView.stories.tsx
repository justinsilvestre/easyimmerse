import type { Cue } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Music } from "lucide-react";
import { fn } from "storybook/test";
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
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { resolveExampleMediaUrl } from "../lookup/exampleMedia.ts";
import type { LookupState } from "../lookup/lookupState.ts";
import { CuePanel } from "./CuePanel.tsx";
import {
  exampleCues,
  exampleFlashcardCueIndexes,
  exampleTranslationCues,
} from "./exampleCues.ts";
import { generateExamplePeaks } from "./examplePeaks.ts";
import { MediaView } from "./MediaView.tsx";
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

function videoStage() {
  return (
    <video
      src="fixtures/sample.mp4"
      preload="metadata"
      className="max-h-full max-w-full"
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
) {
  return (
    <>
      <SubtitleTrackBar
        tracks={tracks}
        onTargetChange={fn()}
        onTranslationChange={fn()}
        onAddFile={fn()}
      />
      <CuePanel
        cues={cues}
        translationCues={translationCues}
        activeCueIndex={3}
        flashcardCueIndexes={exampleFlashcardCueIndexes}
        onSeek={fn()}
        wordGestures={{ onWordClick: fn(), onWordDoubleClick: fn() }}
        onAddSubtitlesFile={fn()}
        onGenerateSubtitles={fn()}
      />
    </>
  );
}

function lookupPopup(state: LookupState | null, mode: "hover" | "search") {
  return (
    <DictionaryPopup
      state={state}
      mode={mode}
      resolveMediaUrl={resolveExampleMediaUrl}
      onSearch={fn()}
      onCreateFlashcard={fn()}
      onClose={fn()}
      onSetUpDictionary={fn()}
    />
  );
}

const meta = {
  title: "Media/MediaView",
  component: MediaView,
  parameters: { layout: "fullscreen" },
  args: {
    media: { title: "Dark S01E01 - Geheimnisse.mkv", language: "de" },
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
    waveform: waveform(),
    panels: { cues: true, waveform: true, distractionFree: false },
    subtitleDisplay: "both",
    playerCallbacks: {
      onTogglePlay: fn(),
      onSeek: fn(),
      onSkip: fn(),
      onVolumeChange: fn(),
      onSpeedChange: fn(),
      onToggleSubtitleDisplay: fn(),
      onToggleCuePanel: fn(),
      onToggleWaveform: fn(),
      onToggleDistractionFree: fn(),
    },
    onBack: fn(),
    wordGestures: {
      onWordClick: fn(),
      onWordDoubleClick: fn(),
      onWordHoverIntent: fn(),
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

export const LookingUpAWord: Story = {
  args: {
    activeWord: "fressen",
    lookup: lookupPopup(
      { kind: "found", term: "fressen", results: exampleResults },
      "hover",
    ),
  },
};

export const LookupWithoutDictionary: Story = {
  args: {
    lookup: lookupPopup({ kind: "noDictionary", language: "de" }, "hover"),
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
    media: { title: "Die Verwandlung, Kapitel 1", language: "de" },
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

export const WaveformHidden: Story = {
  args: { panels: { cues: true, waveform: false, distractionFree: false } },
};

export const DistractionFree: Story = {
  args: { panels: { cues: false, waveform: false, distractionFree: true } },
};
