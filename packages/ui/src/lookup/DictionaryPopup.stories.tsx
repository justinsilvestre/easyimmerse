import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DictionaryPopup } from "./DictionaryPopup.tsx";
import { exampleEntries } from "./exampleLookup.ts";

const meta = {
  title: "Lookup/DictionaryPopup",
  component: DictionaryPopup,
  args: {
    state: { kind: "found", term: "fressen", entries: exampleEntries },
    mode: "hover",
    onSearch: fn(),
    onCreateFlashcard: fn(),
    onClose: fn(),
    onSetUpDictionary: fn(),
  },
} satisfies Meta<typeof DictionaryPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EntriesFound: Story = {};

export const Loading: Story = {
  args: { state: { kind: "loading", term: "fressen" } },
};

export const NothingFound: Story = {
  args: { state: { kind: "notFound", term: "Hundi" } },
};

export const NoDictionary: Story = {
  args: { state: { kind: "noDictionary", language: "de" } },
};

export const SearchMode: Story = {
  args: { mode: "search", state: null },
};

export const SearchModeWithResults: Story = {
  args: { mode: "search" },
};
