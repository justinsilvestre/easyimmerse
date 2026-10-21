import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Notice } from "./Notice.tsx";

const meta = {
  title: "Notices/Notice",
  component: Notice,
  args: {
    tone: "success",
    message: "Saved the flashcard for “fressen”.",
    actions: [{ label: "Undo", onSelect: fn() }],
    onDismiss: fn(),
  },
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SavedWithUndo: Story = {};

export const Discarded: Story = {
  args: {
    tone: "info",
    message: "Discarded your changes to the flashcard for “fressen”.",
  },
};

export const SaveRejected: Story = {
  args: {
    tone: "danger",
    message: "The flashcard for “fressen” can't be saved.",
    actions: [
      { label: "Open", onSelect: fn() },
      { label: "Discard", onSelect: fn() },
    ],
  },
};
