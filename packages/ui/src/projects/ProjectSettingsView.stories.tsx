import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { ProjectSettingsView } from "./ProjectSettingsView.tsx";

const meta = {
  title: "Projects/ProjectSettingsView",
  component: ProjectSettingsView,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    mode: "create",
    initialValues: {
      name: "",
      target_language: "de",
      translation_language: "en",
      flashcard_fields: [...fieldsOfPreset("beginner")],
      default_tags: [],
      tags_media_name: true,
      fills_audio_with_tts: false,
    },
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ProjectSettingsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewProject: Story = {};

export const NewProjectPrefilledFromLast: Story = {
  args: {
    initialValues: {
      name: "",
      target_language: "ja",
      translation_language: "en",
      flashcard_fields: [...fieldsOfPreset("intermediate")],
      default_tags: ["tv"],
      tags_media_name: true,
      fills_audio_with_tts: true,
    },
  },
};

export const EditingSettings: Story = {
  args: {
    mode: "edit",
    initialValues: {
      name: "German",
      target_language: "de",
      translation_language: "en",
      flashcard_fields: [...fieldsOfPreset("advanced")],
      default_tags: ["tv"],
      tags_media_name: false,
      fills_audio_with_tts: false,
    },
  },
};
