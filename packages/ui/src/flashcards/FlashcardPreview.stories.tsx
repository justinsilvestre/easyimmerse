import type { Meta, StoryObj } from "@storybook/react-vite";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { FlashcardPreview } from "./FlashcardPreview.tsx";
import { fieldsOfPreset } from "./flashcardPresets.ts";

const meta = {
  title: "Flashcards/FlashcardPreview",
  component: FlashcardPreview,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    content: exampleFlashcard,
    includedFields: fieldsOfPreset("beginner"),
  },
} satisfies Meta<typeof FlashcardPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Beginner: Story = {};

export const Intermediate: Story = {
  args: { includedFields: fieldsOfPreset("intermediate") },
};

export const Advanced: Story = {
  args: { includedFields: fieldsOfPreset("advanced") },
};

export const EmptyFields: Story = {
  args: {
    content: {
      ...exampleFlashcard,
      l1Definition: "",
      textContextTranslation: "",
      screenshot: null,
      tags: [],
    },
  },
};

export const Compact: Story = { args: { compact: true } };
