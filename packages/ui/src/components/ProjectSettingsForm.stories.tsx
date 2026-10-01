import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";
import { createDefaultProjectSettings } from "./createDefaultProjectSettings.ts";
import { ProjectSettingsForm } from "./ProjectSettingsForm.tsx";

const meta = {
  title: "Components/ProjectSettingsForm",
  component: ProjectSettingsForm,
  parameters: { layout: "padded" },
  args: {
    initialSettings: createDefaultProjectSettings("en"),
    submitLabel: "Create project",
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ProjectSettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewProject: Story = {};

export const EditExisting: Story = {
  args: {
    submitLabel: "Save changes",
    initialSettings: {
      name: "Dark, season one",
      target_language: "de",
      translation_language: "en",
      flashcard_settings: {
        included_fields: [...flashcardPresetFields.beginner],
        default_tags: ["dark", "german_tv"],
        tag_with_media_name: true,
        use_tts_when_no_audio: true,
      },
    },
  },
};

export const CustomFields: Story = {
  args: {
    submitLabel: "Save changes",
    initialSettings: {
      name: "Midnight Diner",
      target_language: "ja",
      translation_language: "en",
      flashcard_settings: {
        included_fields: [
          "word",
          "word_pronunciation",
          "context",
          "screenshot",
        ],
        default_tags: [],
        tag_with_media_name: false,
        use_tts_when_no_audio: false,
      },
    },
  },
};
