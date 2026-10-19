import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DictionaryImportStatusButton } from "./DictionaryImportStatusButton.tsx";

const meta = {
  title: "Dictionaries/DictionaryImportStatusButton",
  component: DictionaryImportStatusButton,
  args: {
    status: { kind: "running", fileName: "jmdict_english.zip", percent: 42 },
    onOpen: fn(),
  },
} satisfies Meta<typeof DictionaryImportStatusButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {};

/** For a format that cannot tell how much of the file has been read. */
export const RunningWithoutPercentage: Story = {
  args: {
    status: { kind: "running", fileName: "Wörter.csv", percent: null },
  },
};

export const Failed: Story = {
  args: { status: { kind: "failed" } },
};
