import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";
import {
  ankiConnectSync,
  deletionsListedSync,
  exportedSync,
  neverExportedSync,
} from "./exampleFlashcardSyncs.ts";
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
    sync: neverExportedSync,
    includedFields: fieldsOfPreset("intermediate"),
    frontFields: frontFieldsOfPreset("intermediate"),
    languages: exampleLanguages,
    onExportPackage: fn(),
    onSetUpAnkiConnect: fn(),
    onTurnOffAnkiConnect: fn(),
    onStartReview: fn(),
    onSendToAnki: fn(),
    onCheckConnection: fn(),
    onCopyAnkiSearch: fn(),
    onMarkDeletionsDone: fn(),
  },
} satisfies Meta<typeof FlashcardSyncPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NeverExported: Story = {};

export const NoFlashcardsYet: Story = {
  args: { sync: { ...neverExportedSync, flashcardCount: 0, nextCard: null } },
};

export const NewAndChangedSinceTheLastExport: Story = {
  args: { sync: exportedSync },
};

export const DeletedFlashcardsToDeleteInAnki: Story = {
  args: { sync: deletionsListedSync },
};

export const EveryFlashcardExported: Story = {
  args: {
    sync: {
      ...exportedSync,
      queue: { newCount: 0, changedCount: 0, hasBeenFlushed: true },
      nextCard: null,
    },
  },
};

export const AnkiChecking: Story = {
  args: { sync: ankiConnectSync({ connection: "checking" }) },
};

export const AnkiConnected: Story = {
  args: { sync: ankiConnectSync() },
};

export const AnkiConnectedWithChangedFlashcards: Story = {
  args: { sync: ankiConnectSync({}, { changedCount: 2 }) },
};

export const AnkiConnectedBeforeAnyFlashcardReachedAnki: Story = {
  args: {
    sync: ankiConnectSync({}, { newCount: 12, hasBeenFlushed: false }),
  },
};

export const AnkiConnectedWithNoFlashcardsYet: Story = {
  args: {
    sync: {
      ...ankiConnectSync({}, { newCount: 0 }),
      flashcardCount: 0,
      nextCard: null,
    },
  },
};

export const AnkiConnectedWithOnlyNotesToDelete: Story = {
  args: {
    sync: {
      ...ankiConnectSync({ pendingDeletionCount: 2 }, { newCount: 0 }),
      nextCard: null,
    },
  },
};

export const SendingToAnki: Story = {
  args: { sync: ankiConnectSync({ isSyncing: true }) },
};

export const AnkiUnreachable: Story = {
  args: { sync: ankiConnectSync({ connection: "unreachable" }) },
};

export const AnkiUnreachableWithNotesToDelete: Story = {
  args: {
    sync: ankiConnectSync({
      connection: "unreachable",
      pendingDeletionCount: 1,
    }),
  },
};

export const AnkiRefusedEasyImmerse: Story = {
  args: {
    sync: ankiConnectSync({
      connection: "denied",
      deniedOrigin: "http://localhost:5173",
    }),
  },
};
