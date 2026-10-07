import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AddMediaFromUrlDialog } from "./AddMediaFromUrlDialog.tsx";
import {
  exampleFailedJob,
  exampleMediaDescription,
  exampleRunningJob,
} from "./exampleMediaSourceJob.ts";

const meta = {
  title: "Projects/AddMediaFromUrlDialog",
  component: AddMediaFromUrlDialog,
  parameters: { layout: "fullscreen" },
  args: {
    sources: [{ name: "video-site-media-source" }],
    languages: { target: "ja", translation: "en" },
    lookup: { isLooking: false, description: null, error: null },
    isStarting: false,
    job: null,
    error: null,
    onLookUp: fn(),
    onAdd: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof AddMediaFromUrlDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneSource: Story = {};

export const SeveralSources: Story = {
  args: {
    sources: [{ name: "video-site-media-source" }, { name: "podcast-feed" }],
  },
};

export const LookingUp: Story = {
  args: { lookup: { isLooking: true, description: null, error: null } },
};

/** The subtitle choice shows once a typed locator has been looked up; type one and press Look up. */
export const LookedUp: Story = {
  args: {
    lookup: {
      isLooking: false,
      description: exampleMediaDescription,
      error: null,
    },
  },
};

export const Starting: Story = {
  args: { isStarting: true },
};

export const Running: Story = {
  args: { job: exampleRunningJob },
};

export const Failed: Story = {
  args: { job: exampleFailedJob },
};

export const CouldNotStart: Story = {
  args: {
    error: "this server has no media directory, so plugins cannot fetch media",
  },
};
