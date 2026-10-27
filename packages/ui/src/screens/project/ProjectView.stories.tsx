import type { FlashcardSync } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLanguages } from "../../components/flashcards/exampleFlashcard.ts";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../projectSettings/flashcardPresets.ts";
import {
  DictionaryStatus,
  type LanguageDictionaryStatus,
} from "./DictionaryStatus.tsx";
import {
  ankiConnectSync,
  exportedSync,
  neverExportedSync,
} from "./exampleFlashcardSyncs.ts";
import type { MediaItem } from "./MediaList.tsx";
import { MediaSection } from "./MediaSection.tsx";
import { ProjectFlashcardsPanel } from "./ProjectFlashcardsPanel.tsx";
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
  flashcardSync: FlashcardSync,
  dictionaries: readonly LanguageDictionaryStatus[] = dictionariesSetUp,
) {
  return (
    <>
      <DictionaryStatus
        statuses={dictionaries}
        dictionariesHref="/projects/p1?settings=dictionaries"
      />
      <MediaSection
        projectId="p1"
        media={mediaItems}
        onAddMedia={fn()}
        importSources={[
          { name: "example-plugin", label: "Add with Example plugin" },
        ]}
        onImportMedia={fn()}
        onDeleteMedia={fn()}
      />
      <ProjectFlashcardsPanel
        sync={flashcardSync}
        includedFields={fieldsOfPreset("intermediate")}
        frontFields={frontFieldsOfPreset("intermediate")}
        languages={exampleLanguages}
        onExportPackage={fn()}
        onSetUpAnkiConnect={fn()}
        onTurnOffAnkiConnect={fn()}
        onStartReview={fn()}
        onReviewMore={fn()}
        onCheckConnection={fn()}
        onTryAnkiSyncAgain={fn()}
        onCopyAnkiSearch={fn()}
        onMarkDeletionsDone={fn()}
      />
    </>
  );
}

const meta = {
  title: "Screens/Project/ProjectView",
  component: ProjectView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    projectId: "p1",
    name: "German",
    children: sections(media, neverExportedSync),
  },
} satisfies Meta<typeof ProjectView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FreshProject: Story = {
  args: {
    children: sections(
      [],
      { ...neverExportedSync, flashcardCount: 0, nextCard: null },
      [
        { language: "de", role: "target", dictionaryCount: 0 },
        { language: "en", role: "translation", dictionaryCount: 0 },
      ],
    ),
  },
};

export const WithMedia: Story = {};

export const ExportingAnkiPackages: Story = {
  args: {
    children: sections(media, exportedSync),
  },
};

export const SendingThroughAnkiConnect: Story = {
  args: {
    children: sections(media, ankiConnectSync({ connection: "unreachable" }), [
      { language: "de", role: "target", dictionaryCount: 2 },
      { language: "en", role: "translation", dictionaryCount: 0 },
    ]),
  },
};
