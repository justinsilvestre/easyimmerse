import type { Cue } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleFlashcard,
  exampleLanguages,
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

const peaks = generateExamplePeaks(240);

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
    media: {
      kind: "video",
      title: "Dark S01E01 - Geheimnisse.mkv",
      url: "fixtures/sample.mp4",
      artworkUrl: null,
      language: "de",
    },
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
    flashcardCueIndexes: exampleFlashcardCueIndexes,
    waveform: { peaks, viewStartMs: 0, viewEndMs: 24_000 },
    panels: { cues: true, waveform: true, distractionFree: false },
    subtitleDisplay: "both",
    editingSegmentId: null,
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
    waveformCallbacks: {
      onSeek: fn(),
      onSegmentClick: fn(),
      onSegmentDoubleClick: fn(),
      onZoomIn: fn(),
      onZoomOut: fn(),
      onHide: fn(),
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
    editingSegmentId: "3",
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
        waveform={{ peaks, durationMs: 24_000 }}
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
    flashcardCueIndexes: [],
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
    media: {
      kind: "audio",
      title: "Die Verwandlung, Kapitel 1",
      url: "fixtures/sample.mp3",
      artworkUrl: null,
      language: "de",
    },
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
