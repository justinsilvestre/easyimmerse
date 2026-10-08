import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleImportForm, exampleNoticeForm } from "./examplePluginForms.ts";
import { PluginFormView } from "./PluginFormView.tsx";

const meta = {
  title: "Plugins/PluginFormView",
  component: PluginFormView,
  args: {
    form: exampleImportForm,
    isBusy: false,
    onAction: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof PluginFormView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryControlKind: Story = {};

export const Busy: Story = {
  args: { isBusy: true },
};

export const NoteOnly: Story = {
  args: { form: exampleNoticeForm, closeLabel: "Close" },
};
