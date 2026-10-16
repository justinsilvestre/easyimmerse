import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { FlashcardDeleteDialog } from "./FlashcardDeleteDialog.tsx";

const meta = {
  title: "Flashcards/FlashcardDeleteDialog",
  component: FlashcardDeleteDialog,
  parameters: { layout: "fullscreen" },
  decorators: [withAppStore],
  args: {
    word: "Haus",
    ankiFate: { note: "none", wasPackaged: false },
    onCancel: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof FlashcardDeleteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NeverInAnki: Story = {};

export const FateInAnkiNotKnown: Story = {
  args: { ankiFate: null },
};

export const DeletedByAnkiConnect: Story = {
  args: { ankiFate: { note: "deletedByAnkiConnect", wasPackaged: false } },
};

export const DeletedByAnkiConnectOnceAnkiIsReached: Story = {
  args: { ankiFate: { note: "deletedByAnkiConnectLater", wasPackaged: false } },
};

export const StaysInAnkiAndListed: Story = {
  args: { ankiFate: { note: "staysListed", wasPackaged: true } },
};

export const StaysInAnki: Story = {
  args: { ankiFate: { note: "stays", wasPackaged: true } },
};

export const OnlyInAPackage: Story = {
  args: { ankiFate: { note: "none", wasPackaged: true } },
};

export const DeletedByAnkiConnectAfterPackages: Story = {
  args: { ankiFate: { note: "deletedByAnkiConnect", wasPackaged: true } },
};
