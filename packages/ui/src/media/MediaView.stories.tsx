import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { exampleEntries } from "../lookup/exampleLookup.ts";
import {
  exampleCues,
  exampleFlashcardCueIndexes,
  exampleTranslationCues,
} from "./exampleCues.ts";
import { generateExamplePeaks } from "./examplePeaks.ts";
import { MediaView } from "./MediaView.tsx";

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
      isPlaying: true,
      currentMs: 6_200,
      durationMs: 24_000,
      volume: 0.8,
      speed: 1,
    },
    tracks: {
      audio: [
        { id: "a1", label: "German (5.1)", language: "de" },
        { id: "a2", label: "English", language: "en" },
      ],
      subtitles: [
        { id: "s1", label: "German", language: "de" },
        { id: "s2", label: "English", language: "en" },
      ],
      audioId: "a1",
      targetSubtitlesId: "s1",
      translationSubtitlesId: "s2",
    },
    cues: exampleCues,
    translationCues: exampleTranslationCues,
    flashcardCueIndexes: exampleFlashcardCueIndexes,
    waveform: {
      peaks: generateExamplePeaks(240),
      viewStartMs: 0,
      viewEndMs: 24_000,
    },
    panels: { cues: true, waveform: true, distractionFree: false },
    subtitleDisplay: "both",
    lookup: null,
    editingFlashcard: null,
    work: { hasUnsavedChanges: false, isBackedUp: true },
    playerCallbacks: {
      onTogglePlay: fn(),
      onSeek: fn(),
      onSkip: fn(),
      onVolumeChange: fn(),
      onSpeedChange: fn(),
      onAudioTrackChange: fn(),
      onTargetSubtitlesChange: fn(),
      onTranslationSubtitlesChange: fn(),
      onAddSubtitlesFile: fn(),
      onLookup: fn(),
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
    },
    onBack: fn(),
    onWordHover: fn(),
    onWordClick: fn(),
    onToggleSubtitleDisplay: fn(),
    onGenerateSubtitles: fn(),
    onSearchLookup: fn(),
    onCreateFlashcard: fn(),
    onCloseLookup: fn(),
    onSetUpDictionary: fn(),
    onSaveFlashcard: fn(),
    onDeleteFlashcard: fn(),
    onCloseFlashcard: fn(),
    onSaveProject: fn(),
    onLogIn: fn(),
  },
} satisfies Meta<typeof MediaView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VideoWithDualSubtitles: Story = {};

export const LookingUpAWord: Story = {
  args: {
    playback: {
      isPlaying: false,
      currentMs: 6_200,
      durationMs: 24_000,
      volume: 0.8,
      speed: 1,
    },
    lookup: {
      mode: "hover",
      state: { kind: "found", term: "fressen", entries: exampleEntries },
    },
  },
};

export const LookupWithoutDictionary: Story = {
  args: {
    lookup: { mode: "hover", state: { kind: "noDictionary", language: "de" } },
  },
};

export const SearchingForAWord: Story = {
  args: { lookup: { mode: "search", state: null } },
};

export const EditingAFlashcard: Story = {
  args: {
    editingFlashcard: {
      id: "flashcard-3",
      content: exampleFlashcard,
      fields: fieldsOfPreset("intermediate"),
      segment: { segmentId: "3", screenshotMs: 6_800 },
    },
    work: { hasUnsavedChanges: true, isBackedUp: false },
  },
};

export const NoSubtitles: Story = {
  args: {
    cues: [],
    translationCues: [],
    flashcardCueIndexes: [],
    tracks: {
      audio: [{ id: "a1", label: "German", language: "de" }],
      subtitles: [],
      audioId: "a1",
      targetSubtitlesId: null,
      translationSubtitlesId: null,
    },
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
    panels: { cues: true, waveform: true, distractionFree: false },
  },
};

export const DistractionFree: Story = {
  args: { panels: { cues: false, waveform: false, distractionFree: true } },
};
