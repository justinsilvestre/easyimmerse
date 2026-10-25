import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { exampleImportForm, exampleNoticeForm } from "./examplePluginForms.ts";
import { PluginFormDialog } from "./PluginFormDialog.tsx";

const meta = {
  title: "Components/Plugins/PluginFormDialog",
  component: PluginFormDialog,
  decorators: [withAppStore],
  args: {
    form: exampleImportForm,
    fallbackTitle: "Add with Example plugin",
    loadingMessage: "Asking the plugin what it needs…",
    error: null,
    isBusy: false,
    onAction: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof PluginFormDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryControlKind: Story = {};

export const Busy: Story = {
  args: { isBusy: true },
};

export const NoteOnly: Story = {
  args: { form: exampleNoticeForm, closeLabel: "Close" },
};

export const WaitingForTheForm: Story = {
  args: {
    form: null,
    children: <p className="text-sm text-fg-muted">Asking the plugin…</p>,
  },
};
