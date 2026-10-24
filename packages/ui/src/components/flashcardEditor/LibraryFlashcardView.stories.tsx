import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { LibraryFlashcardView } from "./LibraryFlashcardView.tsx";

const meta = {
  title: "Components/Flashcard Editor/LibraryFlashcardView",
  component: LibraryFlashcardView,
  decorators: [
    (Story) => (
      <div className="h-[36rem] max-w-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    content: exampleFlashcard,
    settings: {
      flashcard_fields: [
        "word",
        "l1_definition",
        "text_context",
        "audio_context",
        "screenshot",
      ],
      flashcard_front_fields: ["text_context"],
    },
    languages: { target: "de", translation: "en" },
    ankiFate: null,
    isConfirmingDelete: false,
    onPlayAudio: fn(),
    onUnsuspend: null,
    onAskDelete: fn(),
    onCancelDelete: fn(),
    onDelete: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof LibraryFlashcardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FromAVideo: Story = {};

export const FromAText: Story = {
  args: {
    content: { ...exampleFlashcard, audio_context: null, screenshot: null },
    onPlayAudio: undefined,
  },
};

export const Suspended: Story = { args: { onUnsuspend: fn() } };

export const ConfirmingDelete: Story = { args: { isConfirmingDelete: true } };
