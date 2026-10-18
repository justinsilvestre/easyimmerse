import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleSourceMediaForm } from "../plugins/examplePluginForms.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { SourceMediaDialog } from "./SourceMediaDialog.tsx";

const meta = {
  title: "Subtitles/SourceMediaDialog",
  component: SourceMediaDialog,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
  args: {
    title: "Video site",
    form: exampleSourceMediaForm,
    isBusy: false,
    error: null,
    onAction: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof SourceMediaDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AskingForTheForm: Story = {
  args: { form: null },
};

export const Offered: Story = {};

export const Applying: Story = {
  args: { isBusy: true },
};

export const Failed: Story = {
  args: { error: "The subtitles could not be fetched: the video is private." },
};

export const FormUnavailable: Story = {
  args: { form: null, error: "The plugin could not be reached." },
};
