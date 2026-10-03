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
      targetLanguage: "de",
      translationLanguage: "en",
      flashcardFields: fieldsOfPreset("beginner"),
      defaultTags: [],
      fillsAudioWithTts: false,
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
      targetLanguage: "ja",
      translationLanguage: "en",
      flashcardFields: fieldsOfPreset("intermediate"),
      defaultTags: ["tv"],
      fillsAudioWithTts: true,
    },
  },
};

export const EditingSettings: Story = {
  args: {
    mode: "edit",
    initialValues: {
      name: "German",
      targetLanguage: "de",
      translationLanguage: "en",
      flashcardFields: fieldsOfPreset("advanced"),
      defaultTags: ["tv"],
      fillsAudioWithTts: false,
    },
  },
};
