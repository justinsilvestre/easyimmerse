import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FlashcardSaveNotice } from "./FlashcardSaveNotice.tsx";

const meta = {
  title: "Flashcards/FlashcardSaveNotice",
  component: FlashcardSaveNotice,
  args: { outcome: "savedInProject", onDismiss: fn(), onRetry: fn() },
} satisfies Meta<typeof FlashcardSaveNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SavedInProject: Story = {};

export const SentToAnki: Story = { args: { outcome: "sentToAnki" } };

export const QueuedForAnki: Story = { args: { outcome: "queuedForAnki" } };

export const RejectedByAnki: Story = { args: { outcome: "rejectedByAnki" } };
