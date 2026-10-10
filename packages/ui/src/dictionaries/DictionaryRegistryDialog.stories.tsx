import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { DictionaryRegistryDialog } from "./DictionaryRegistryDialog.tsx";
import { exampleRegistry } from "./exampleDictionaries.ts";

const meta = {
  title: "Dictionaries/DictionaryRegistryDialog",
  component: DictionaryRegistryDialog,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    entries: exampleRegistry,
    languageFilter: "",
    onLanguageFilterChange: fn(),
    onInstall: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof DictionaryRegistryDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllLanguages: Story = {};

export const FilteredByLanguage: Story = { args: { languageFilter: "ja" } };

export const NothingForLanguage: Story = { args: { languageFilter: "ko" } };
