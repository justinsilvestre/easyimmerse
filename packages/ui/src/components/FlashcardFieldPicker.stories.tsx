import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { flashcardFieldOrder } from "../flashcardFieldOrder.ts";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";
import { FlashcardFieldPicker } from "./FlashcardFieldPicker.tsx";

const meta = {
  title: "Components/FlashcardFieldPicker",
  component: FlashcardFieldPicker,
  args: {
    includedFields: [...flashcardPresetFields.intermediate],
    onChange: fn(),
  },
} satisfies Meta<typeof FlashcardFieldPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IntermediatePreset: Story = {};

export const CustomSelection: Story = {
  args: { includedFields: ["word", "l2_definition", "context"] },
};

export const AllFields: Story = {
  args: { includedFields: [...flashcardFieldOrder] },
};
