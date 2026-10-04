import type { Cue } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { WaveformStrip } from "../components/waveform/WaveformStrip.tsx";
import {
  exampleFlashcard,
  exampleLanguages,
} from "../flashcards/exampleFlashcard.ts";
import { FlashcardEditor } from "../flashcards/FlashcardEditor.tsx";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { UnsavedWorkBanner } from "../flashcards/UnsavedWorkBanner.tsx";
import { DictionaryPopup } from "../lookup/DictionaryPopup.tsx";
import { exampleEntries } from "../lookup/exampleLookup.ts";
import type { LookupState } from "../lookup/lookupState.ts";
import { CuePanel } from "./CuePanel.tsx";
import {
  exampleCues,
  exampleFlashcardCueIndexes,
  exampleTranslationCues,
} from "./exampleCues.ts";
import { exampleWaveformWindows } from "./exampleWaveformWindows.ts";
import { MediaView } from "./MediaView.tsx";
import type { TrackSelection } from "./playback.ts";
import { SubtitleTrackBar } from "./SubtitleTrackBar.tsx";

const tracks: TrackSelection = {
  audio: [
    { id: "a1", label: "German (5.1)", language: "de", sample: null },
    { id: "a2", label: "English", language: "en", sample: null },
  ],
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
  audioId: "a1",
  targetSubtitlesId: "s1",
  translationSubtitlesId: "s2",
};

const waveformWindows = exampleWaveformWindows(24_000);

/** The waveform strip as the media screen draws it, over the example audio. */
function waveformStrip(currentTimeMs: number) {
  return (
    <WaveformStrip
      durationMs={24_000}
      currentTimeMs={currentTimeMs}
      windows={waveformWindows}
      cues={exampleCues}
      flashcardSegments={exampleFlashcardCueIndexes.flatMap((index) => {
        const cue = exampleCues.find((candidate) => candidate.index === index);
        return cue
          ? [
              {
                id: String(index),
                startMs: cue.start_ms,
                endMs: cue.end_ms,
                screenshotMs: (cue.start_ms + cue.end_ms) / 2,
              },
            ]
          : [];
      })}
      visibleSpanMs={24_000}
      onSeek={fn()}
      onOpenFlashcardSegment={fn()}
      onClipEndpointMoved={fn()}
      onScreenshotMarkerMoved={fn()}
      onVisibleSpanChange={fn()}
    />
  );
}

/** A stand-in for the player: the sample video, or the placeholder an audio file shows. */
function stage(kind: "video" | "audio") {
  return kind === "video" ? (
    <video
      src="fixtures/sample.mp4"
      preload="metadata"
      aria-label="Video"
      className="max-h-full max-w-full"
    >
      {/* The subtitles are drawn by the overlay rather than by the browser. */}
      <track kind="captions" />
    </video>
  ) : (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="flex size-56 items-center justify-center rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 shadow-xl" />
      <p className="text-lg text-gray-300">Die Verwandlung, Kapitel 1</p>
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
        onWordHover={fn()}
        onWordClick={fn()}
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
    title: "Dark S01E01 - Geheimnisse.mkv",
    language: "de",
    stage: stage("video"),
    playback: {
      isPlaying: false,
      currentMs: 6_200,
      durationMs: 24_000,
      volume: 0.8,
      speed: 1,
    },
    tracks,
    cues: exampleCues,
    translationCues: exampleTranslationCues,
    waveform: waveformStrip(6_200),
    panels: { cues: true, waveform: true, distractionFree: false },
    subtitleDisplay: "both",
    playerCallbacks: {
      onTogglePlay: fn(),
      onSeek: fn(),
      onSkip: fn(),
      onVolumeChange: fn(),
      onSpeedChange: fn(),
      onAudioTrackChange: fn(),
      onToggleSubtitleDisplay: fn(),
      onToggleCuePanel: fn(),
      onToggleWaveform: fn(),
      onToggleDistractionFree: fn(),
    },
    onBack: fn(),
    onWordHover: fn(),
    onWordClick: fn(),
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
      { kind: "found", term: "fressen", entries: exampleEntries },
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
        initialContent={exampleFlashcard}
        initialFields={fieldsOfPreset("intermediate")}
        languages={exampleLanguages}
        waveform={{ windows: waveformWindows, durationMs: 24_000 }}
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
    tracks: {
      audio: [{ id: "a1", label: "German", language: "de", sample: null }],
      subtitles: [],
      audioId: "a1",
      targetSubtitlesId: null,
      translationSubtitlesId: null,
    },
    sidePanel: subtitlesPanel([], []),
  },
};

export const AudioWithTranscript: Story = {
  args: {
    title: "Die Verwandlung, Kapitel 1",
    stage: stage("audio"),
    translationCues: [],
    sidePanel: subtitlesPanel(exampleCues, []),
  },
};

export const Playing: Story = {
  args: {
    playback: {
      isPlaying: true,
      currentMs: 6_200,
      durationMs: 24_000,
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
