import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TrackPickerDialog } from "./TrackPickerDialog.tsx";

const meta = {
  title: "Media/TrackPickerDialog",
  component: TrackPickerDialog,
  parameters: { layout: "fullscreen" },
  args: {
    purpose: "targetSubtitles",
    wantedLanguage: "de",
    tracks: [
      {
        id: "s1",
        label: "German (full)",
        language: "de",
        sample: "Hast du das Licht gesehen?\nNein. Es war nur der Wind.",
      },
      {
        id: "s2",
        label: "German (forced)",
        language: "de",
        sample: "[Schild] Winden, 1986",
      },
      {
        id: "s3",
        label: "English",
        language: "en",
        sample: "Did you see the light?\nNo. It was only the wind.",
      },
      {
        id: "s4",
        label: "Track 4",
        language: null,
        sample: "¿Viste la luz?\nNo. Solo era el viento.",
      },
    ],
    onChoose: fn(),
    onSkip: fn(),
  },
} satisfies Meta<typeof TrackPickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Subtitles: Story = {};

export const TranslationSubtitles: Story = {
  args: {
    purpose: "translationSubtitles",
    wantedLanguage: "en",
    tracks: [
      {
        id: "s3",
        label: "English",
        language: "en",
        sample: "Did you see the light?\nNo. It was only the wind.",
      },
      {
        id: "s5",
        label: "English (SDH)",
        language: "en",
        sample: "[wind howling]\nDid you see the light?",
      },
    ],
  },
};
