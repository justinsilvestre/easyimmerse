import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { FlashcardSyncPanel } from "./FlashcardSyncPanel.tsx";

const meta = {
  title: "Projects/FlashcardSyncPanel",
  component: FlashcardSyncPanel,
  decorators: [
    (Story) => (
      <div className="w-[40rem]">
        <Story />
      </div>
    ),
  ],
  args: {
    state: { kind: "notStarted" },
    includedFields: fieldsOfPreset("intermediate"),
    onExportPackage: fn(),
    onSetUpAnkiConnect: fn(),
    onStartReview: fn(),
    onSendToAnki: fn(),
  },
} satisfies Meta<typeof FlashcardSyncPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {};

export const Reviewing: Story = {
  args: { state: { kind: "review", dueCount: 12, nextCard: exampleFlashcard } },
};

export const AnkiPackageWithNewCards: Story = {
  args: {
    state: {
      kind: "ankiPackage",
      unexportedCount: 5,
      nextCard: exampleFlashcard,
    },
  },
};

export const AnkiPackageUpToDate: Story = {
  args: { state: { kind: "ankiPackage", unexportedCount: 0, nextCard: null } },
};

export const AnkiConnected: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "connected",
      unsentCount: 3,
      nextCard: exampleFlashcard,
    },
  },
};

export const AnkiUnreachable: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "unreachable",
      unsentCount: 3,
      nextCard: exampleFlashcard,
    },
  },
};
