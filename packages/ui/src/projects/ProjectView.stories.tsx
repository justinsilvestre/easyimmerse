import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import type { MediaItem } from "./MediaList.tsx";
import { ProjectView } from "./ProjectView.tsx";

const media: MediaItem[] = [
  {
    id: "m1",
    name: "Dark S01E01 - Geheimnisse.mkv",
    kind: "video",
    durationMs: 3_075_000,
    timedText: ["target", "translation"],
    flashcardCount: 37,
  },
  {
    id: "m2",
    name: "Dark S01E02 - Lügen.mkv",
    kind: "video",
    durationMs: 2_670_000,
    timedText: ["target"],
    flashcardCount: 12,
  },
  {
    id: "m3",
    name: "Dark S01E03 - Gestern und Heute.mkv",
    kind: "video",
    durationMs: 2_712_000,
    timedText: [],
    flashcardCount: 0,
  },
  {
    id: "m4",
    name: "Die Verwandlung (Hörbuch).mp3",
    kind: "audio",
    durationMs: 7_560_000,
    timedText: ["target"],
    flashcardCount: 4,
  },
  {
    id: "m5",
    name: "Die Verwandlung.epub",
    kind: "ebook",
    durationMs: null,
    timedText: ["target", "translation"],
    flashcardCount: 9,
  },
];

const meta = {
  title: "Screens/ProjectView",
  component: ProjectView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    name: "Dark, season one",
    media,
    dictionaries: [
      { language: "de", role: "target", dictionaryCount: 2 },
      { language: "en", role: "translation", dictionaryCount: 1 },
    ],
    flashcardSync: { kind: "notStarted" },
    includedFields: fieldsOfPreset("intermediate"),
    hasUnsavedChanges: false,
    onBack: fn(),
    onSave: fn(),
    onEditSettings: fn(),
    onAddMedia: fn(),
    onOpenMedia: fn(),
    onOpenDictionaries: fn(),
    onExportPackage: fn(),
    onSetUpAnkiConnect: fn(),
    onStartReview: fn(),
    onSendToAnki: fn(),
  },
} satisfies Meta<typeof ProjectView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FreshProject: Story = {
  args: {
    media: [],
    dictionaries: [
      { language: "de", role: "target", dictionaryCount: 0 },
      { language: "en", role: "translation", dictionaryCount: 0 },
    ],
  },
};

export const WithMedia: Story = {};

export const ReviewingInApp: Story = {
  args: {
    flashcardSync: { kind: "review", dueCount: 12, nextCard: exampleFlashcard },
    hasUnsavedChanges: true,
  },
};

export const ExportingAnkiPackages: Story = {
  args: {
    flashcardSync: {
      kind: "ankiPackage",
      unexportedCount: 5,
      nextCard: exampleFlashcard,
    },
  },
};

export const SendingThroughAnkiConnect: Story = {
  args: {
    flashcardSync: {
      kind: "ankiConnect",
      connection: "unreachable",
      unsentCount: 3,
      nextCard: exampleFlashcard,
    },
    dictionaries: [
      { language: "de", role: "target", dictionaryCount: 2 },
      { language: "en", role: "translation", dictionaryCount: 0 },
    ],
  },
};
