import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  exampleFlashcard,
  exampleLanguages,
} from "../flashcards/exampleFlashcard.ts";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";
import { FlashcardSyncPanel } from "./FlashcardSyncPanel.tsx";

const meta = {
  title: "Projects/FlashcardSyncPanel",
  component: FlashcardSyncPanel,
  decorators: [
    (Story) => (
      <div className="w-full max-w-[40rem]">
        <Story />
      </div>
    ),
  ],
  args: {
    state: { kind: "notStarted" },
    includedFields: fieldsOfPreset("intermediate"),
    frontFields: frontFieldsOfPreset("intermediate"),
    languages: exampleLanguages,
    onExportPackage: fn(),
    onSetUpAnkiConnect: fn(),
    onStartReview: fn(),
    onSendToAnki: fn(),
    onCheckConnection: fn(),
    onChangeDestination: fn(),
  },
} satisfies Meta<typeof FlashcardSyncPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {};

export const NotStartedWithOptionsComingSoon: Story = {
  args: { comingSoon: ["review", "ankiPackage", "ankiConnect"] },
};

export const Reviewing: Story = {
  args: { state: { kind: "review", dueCount: 12, nextCard: exampleFlashcard } },
};

export const AnkiPackageWithNewCards: Story = {
  args: {
    state: {
      kind: "ankiPackage",
      flashcardCount: 12,
      newCount: 5,
      changedCount: 2,
      nextCard: exampleFlashcard,
    },
  },
};

export const AnkiPackageUpToDate: Story = {
  args: {
    state: {
      kind: "ankiPackage",
      flashcardCount: 12,
      newCount: 0,
      changedCount: 0,
      nextCard: null,
    },
  },
};

export const AnkiChecking: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "checking",
      deniedOrigin: null,
      flashcardCount: 12,
      unsentCount: 3,
      pendingDeletionCount: 0,
      nextCard: exampleFlashcard,
      isSyncing: false,
    },
  },
};

export const AnkiConnected: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "connected",
      deniedOrigin: null,
      flashcardCount: 12,
      unsentCount: 3,
      pendingDeletionCount: 0,
      nextCard: exampleFlashcard,
      isSyncing: false,
    },
  },
};

export const AnkiConnectedWithNoFlashcardsYet: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "connected",
      deniedOrigin: null,
      flashcardCount: 0,
      unsentCount: 0,
      pendingDeletionCount: 0,
      nextCard: null,
      isSyncing: false,
    },
  },
};

export const AnkiConnectedWithOnlyNotesToDelete: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "connected",
      deniedOrigin: null,
      flashcardCount: 12,
      unsentCount: 0,
      pendingDeletionCount: 2,
      nextCard: null,
      isSyncing: false,
    },
  },
};

export const SendingToAnki: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "connected",
      deniedOrigin: null,
      flashcardCount: 12,
      unsentCount: 3,
      pendingDeletionCount: 0,
      nextCard: exampleFlashcard,
      isSyncing: true,
    },
  },
};

export const AnkiUnreachable: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "unreachable",
      deniedOrigin: null,
      flashcardCount: 12,
      unsentCount: 3,
      pendingDeletionCount: 0,
      nextCard: exampleFlashcard,
      isSyncing: false,
    },
  },
};

export const AnkiUnreachableWithNotesToDelete: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "unreachable",
      deniedOrigin: null,
      flashcardCount: 12,
      unsentCount: 3,
      pendingDeletionCount: 1,
      nextCard: exampleFlashcard,
      isSyncing: false,
    },
  },
};

export const AnkiRefusedEasyImmerse: Story = {
  args: {
    state: {
      kind: "ankiConnect",
      connection: "denied",
      deniedOrigin: "http://localhost:5173",
      flashcardCount: 12,
      unsentCount: 3,
      pendingDeletionCount: 0,
      nextCard: exampleFlashcard,
      isSyncing: false,
    },
  },
};
