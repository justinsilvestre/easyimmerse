import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../../screens/projectSettings/flashcardPresets.ts";
import {
  exampleFlashcard,
  exampleLanguages,
  exampleScreenshotUrl,
} from "./exampleFlashcard.ts";
import { FlashcardPreview } from "./FlashcardPreview.tsx";

const meta = {
  title: "Components/Flashcards/FlashcardPreview",
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

/** Plain-text fields keep their line breaks, as the exported Anki card shows them. */
export const MultilineFields: Story = {
  args: {
    content: {
      ...exampleFlashcard,
      text_context: "Der Hund will fressen.\nEr hat Hunger.",
      text_context_translation: "The dog wants to eat.\nIt is hungry.",
    },
  },
};

/** The front alone, as the flashcards panel shows the next card to review. */
export const FrontOnly: Story = {
  args: { compact: true, frontOnly: true },
};
