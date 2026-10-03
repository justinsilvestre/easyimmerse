import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { FlashcardEditor } from "./FlashcardEditor.tsx";
import { fieldsOfPreset } from "./flashcardPresets.ts";

const meta = {
  title: "Flashcards/FlashcardEditor",
  component: FlashcardEditor,
  decorators: [
    (Story) => (
      <div className="h-[36rem] w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    initialContent: exampleFlashcard,
    initialFields: fieldsOfPreset("intermediate"),
    onSave: fn(),
    onDelete: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof FlashcardEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Intermediate: Story = {};

export const Beginner: Story = {
  args: { initialFields: fieldsOfPreset("beginner") },
};

export const FromAnEbook: Story = {
  args: {
    initialContent: {
      ...exampleFlashcard,
      audioContext: null,
      screenshot: null,
      tags: ["die-verwandlung"],
    },
  },
};
