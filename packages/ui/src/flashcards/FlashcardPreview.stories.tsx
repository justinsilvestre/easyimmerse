import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleFlashcard,
  exampleLanguages,
  exampleScreenshotUrl,
} from "./exampleFlashcard.ts";
import { FlashcardPreview } from "./FlashcardPreview.tsx";
import { fieldsOfPreset, frontFieldsOfPreset } from "./flashcardPresets.ts";

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
    frontFields: frontFieldsOfPreset("beginner"),
    languages: exampleLanguages,
    screenshotUrl: exampleScreenshotUrl,
  },
} satisfies Meta<typeof FlashcardPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Beginner: Story = {};

/** With a way to play the sentence audio, the preview offers a play button in place of the audio mark. */
export const PlayableAudio: Story = {
  args: { onPlayAudio: fn() },
};

export const Intermediate: Story = {
  args: {
    includedFields: fieldsOfPreset("intermediate"),
    frontFields: frontFieldsOfPreset("intermediate"),
  },
};

export const Advanced: Story = {
  args: {
    includedFields: fieldsOfPreset("advanced"),
    frontFields: frontFieldsOfPreset("advanced"),
  },
};

/** A flashcard from an ebook has no audio or screenshot, so the front falls back to the word and the sentence. */
export const FallbackFront: Story = {
  args: {
    content: { ...exampleFlashcard, audio_context: null, screenshot: null },
    screenshotUrl: null,
  },
};

export const NoFrontFieldsChosen: Story = {
  args: { frontFields: [] },
};

export const EmptyFields: Story = {
  args: {
    content: {
      ...exampleFlashcard,
      l1_definition: "",
      text_context_translation: "",
      screenshot: null,
      tags: [],
    },
  },
};

export const Compact: Story = { args: { compact: true } };

/** Definitions written in Markdown appear formatted, as the exported Anki card shows them. */
export const FormattedDefinitions: Story = {
  args: {
    content: {
      ...exampleFlashcard,
      l1_definition:
        "1. to *eat* (of an animal)\n2. to **devour**, to ~~eat~~ gobble up",
      l2_definition:
        "- (von Tieren) *Nahrung zu sich nehmen*\n- (derb) gierig essen\n\nSiehe [Duden](https://www.duden.de/rechtschreibung/fressen).",
    },
    includedFields: [...fieldsOfPreset("beginner"), "l2_definition"],
  },
};

export const FormattedDefinitionsCompact: Story = {
  args: { ...FormattedDefinitions.args, compact: true },
};
