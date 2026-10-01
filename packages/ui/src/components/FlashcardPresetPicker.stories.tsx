import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";
import { FlashcardPresetPicker } from "./FlashcardPresetPicker.tsx";

const meta = {
  title: "Components/FlashcardPresetPicker",
  component: FlashcardPresetPicker,
  args: {
    includedFields: [...flashcardPresetFields.intermediate],
    onPresetChosen: fn(),
  },
} satisfies Meta<typeof FlashcardPresetPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Beginner: Story = {
  args: { includedFields: [...flashcardPresetFields.beginner] },
};

export const Intermediate: Story = {};

export const Advanced: Story = {
  args: { includedFields: [...flashcardPresetFields.advanced] },
};

export const CustomSelection: Story = {
  args: { includedFields: ["word", "context", "screenshot"] },
};
