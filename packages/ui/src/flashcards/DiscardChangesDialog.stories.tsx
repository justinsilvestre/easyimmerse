import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DiscardChangesDialog } from "./DiscardChangesDialog.tsx";

const meta = {
  title: "Flashcards/DiscardChangesDialog",
  component: DiscardChangesDialog,
  args: { onDiscard: fn(), onKeepEditing: fn() },
} satisfies Meta<typeof DiscardChangesDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnsavedChanges: Story = {};
