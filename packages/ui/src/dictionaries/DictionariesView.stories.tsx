import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { DictionariesView } from "./DictionariesView.tsx";
import { exampleDictionaries } from "./exampleDictionaries.ts";

const meta = {
  title: "Dictionaries/DictionariesView",
  component: DictionariesView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    dictionaries: exampleDictionaries,
    unsupportedFile: null,
    importFailure: null,
    pendingTable: null,
    onBack: fn(),
    onAddFromRegistry: fn(),
    onAddFromFile: fn(),
    onToggle: fn(),
    onMove: fn(),
    onRemove: fn(),
    onDismissUnsupportedFile: fn(),
    onDismissImportFailure: fn(),
    onImportTable: fn(),
    onCancelTable: fn(),
  },
} satisfies Meta<typeof DictionariesView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralDictionaries: Story = {};

/** As the app shows them today: without a registry, and without switching dictionaries off or reordering them. */
export const WithoutRegistryOrOrdering: Story = {
  args: {
    onAddFromRegistry: undefined,
    onToggle: undefined,
    onMove: undefined,
  },
};

/** After the removal of the first dictionary was confirmed, while the server deletes it. */
export const RemovingOne: Story = {
  args: { removingIds: ["d1"] },
};

/** Before the server has reported any progress. */
export const Adding: Story = {
  args: { addingFile: "jmdict_english.zip" },
};

export const AddingWithProgress: Story = {
  args: {
    addingFile: "jmdict_english.zip",
    importProgress: {
      entries: 123_456,
      term_meta: 0,
      kanji: 0,
      kanji_meta: 0,
      tags: 12,
      media: 0,
    },
  },
};

export const ImportFailed: Story = {
  args: {
    importFailure:
      "jmdict_english.zip could not be added: term_bank_3.json is not valid JSON",
  },
};

export const Loading: Story = {
  args: { dictionaries: [], isLoading: true },
};

export const NoServer: Story = {
  args: { dictionaries: [], loadFailed: true },
};

export const Empty: Story = { args: { dictionaries: [] } };

export const UnsupportedFile: Story = {
  args: { unsupportedFile: "duden.lsd" },
};

export const AddingTable: Story = {
  args: {
    pendingTable: {
      fileName: "animals.csv",
      preview: {
        layout: {
          columns: ["term", "reading", "definition"],
          hasHeader: false,
        },
        rows: [
          ["猫", "ねこ", "cat"],
          ["犬", "いぬ", "dog"],
          ["鳥", "とり", "bird"],
        ],
      },
    },
  },
};
