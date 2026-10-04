import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DictionaryFileDialog } from "./DictionaryFileDialog.tsx";

const meta = {
  title: "Dictionaries/DictionaryFileDialog",
  component: DictionaryFileDialog,
  parameters: { layout: "fullscreen" },
  args: {
    initialLanguages: { sourceLanguage: "de", targetLanguage: "en" },
    onChooseFile: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof DictionaryFileDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bilingual: Story = {};

export const Monolingual: Story = {
  args: { initialLanguages: { sourceLanguage: "ja", targetLanguage: "ja" } },
};
