import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleImportForm,
  exampleLookedUpForm,
} from "../plugins/examplePluginForms.ts";
import {
  exampleFailedJob,
  exampleRunningJob,
} from "./exampleMediaSourceJob.ts";
import { ImportMediaDialog } from "./ImportMediaDialog.tsx";

const meta = {
  title: "Projects/ImportMediaDialog",
  component: ImportMediaDialog,
  parameters: { layout: "fullscreen" },
  args: {
    label: "Add from a video site",
    form: exampleImportForm,
    isBusy: false,
    job: null,
    error: null,
    onAction: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ImportMediaDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AskingForTheForm: Story = {
  args: { form: null },
};

export const FirstForm: Story = {};

export const LookedUp: Story = {
  args: { form: exampleLookedUpForm },
};

export const WaitingForThePlugin: Story = {
  args: { form: exampleLookedUpForm, isBusy: true },
};

export const Running: Story = {
  args: { form: exampleLookedUpForm, job: exampleRunningJob },
};

export const Failed: Story = {
  args: { form: exampleLookedUpForm, job: exampleFailedJob },
};

export const CouldNotStart: Story = {
  args: {
    form: exampleLookedUpForm,
    error: "The server has no folder for fetched media.",
  },
};

export const FormUnavailable: Story = {
  args: { form: null, error: "The plugin “video-site” is not installed." },
};
