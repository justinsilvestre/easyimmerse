import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleFlashcard,
  exampleLanguages,
} from "../flashcards/exampleFlashcard.ts";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import {
  DictionaryStatus,
  type LanguageDictionaryStatus,
} from "./DictionaryStatus.tsx";
import {
  FlashcardSyncPanel,
  type FlashcardSyncState,
} from "./FlashcardSyncPanel.tsx";
import type { MediaItem } from "./MediaList.tsx";
import { MediaSection } from "./MediaSection.tsx";
import { ProjectView } from "./ProjectView.tsx";

const media: MediaItem[] = [
  {
    id: "m1",
    name: "Dark S01E01 - Geheimnisse.mkv",
    kind: "video",
    flashcardCount: 37,
  },
  {
    id: "m2",
    name: "Dark S01E02 - Lügen.mkv",
    kind: "video",
    flashcardCount: 12,
  },
  {
    id: "m3",
    name: "Dark S01E03 - Gestern und Heute.mkv",
    kind: "video",
    flashcardCount: 0,
  },
  {
    id: "m4",
    name: "Die Verwandlung (Hörbuch).mp3",
    kind: "audio",
    flashcardCount: 4,
  },
  {
    id: "m5",
    name: "Die Verwandlung.epub",
    kind: "ebook",
    flashcardCount: 9,
  },
];

const dictionariesSetUp: LanguageDictionaryStatus[] = [
  { language: "de", role: "target", dictionaryCount: 2 },
  { language: "en", role: "translation", dictionaryCount: 1 },
];

/** The sections of a project with the given media and flashcard state, wired to the Actions panel. */
function sections(
  mediaItems: readonly MediaItem[],
  flashcardSync: FlashcardSyncState,
  dictionaries: readonly LanguageDictionaryStatus[] = dictionariesSetUp,
) {
  return (
    <>
      <DictionaryStatus statuses={dictionaries} onOpenDictionaries={fn()} />
      <MediaSection
        media={mediaItems}
        onAddMedia={fn()}
        onOpenMedia={fn()}
        onDeleteMedia={fn()}
      />
      <FlashcardSyncPanel
        state={flashcardSync}
        includedFields={fieldsOfPreset("intermediate")}
        languages={exampleLanguages}
        onExportPackage={fn()}
        onSetUpAnkiConnect={fn()}
        onStartReview={fn()}
        onSendToAnki={fn()}
      />
    </>
  );
}

const meta = {
  title: "Projects/ProjectView",
  component: ProjectView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    name: "German",
    onBack: fn(),
    onEditSettings: fn(),
    children: sections(media, { kind: "notStarted" }),
  },
} satisfies Meta<typeof ProjectView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FreshProject: Story = {
  args: {
    children: sections([], { kind: "notStarted" }, [
      { language: "de", role: "target", dictionaryCount: 0 },
      { language: "en", role: "translation", dictionaryCount: 0 },
    ]),
  },
};

export const WithMedia: Story = {};

export const ReviewingInApp: Story = {
  args: {
    children: sections(media, {
      kind: "review",
      dueCount: 12,
      nextCard: exampleFlashcard,
    }),
  },
};

export const ExportingAnkiPackages: Story = {
  args: {
    children: sections(media, {
      kind: "ankiPackage",
      unexportedCount: 5,
      nextCard: exampleFlashcard,
    }),
  },
};

export const SendingThroughAnkiConnect: Story = {
  args: {
    children: sections(
      media,
      {
        kind: "ankiConnect",
        connection: "unreachable",
        unsentCount: 3,
        nextCard: exampleFlashcard,
      },
      [
        { language: "de", role: "target", dictionaryCount: 2 },
        { language: "en", role: "translation", dictionaryCount: 0 },
      ],
    ),
  },
};
