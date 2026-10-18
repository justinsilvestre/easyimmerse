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
import { ProjectFlashcardsPanel } from "./ProjectFlashcardsPanel.tsx";

const meta = {
  title: "Projects/ProjectFlashcardsPanel",
  component: ProjectFlashcardsPanel,
  decorators: [
    (Story) => (
      <div className="w-[min(40rem,calc(100vw-2rem))]">
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
    onCheckConnection: fn(),
    onTryAnkiSyncAgain: fn(),
    onCopyAnkiSearch: fn(),
    onMarkDeletionsDone: fn(),
  },
} satisfies Meta<typeof ProjectFlashcardsPanel>;

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

export const AnkiSyncFailed: Story = {
  args: { sync: ankiConnectSync({ hasSyncFailed: true }) },
};

export const AnkiSyncFailedWithNotesToDelete: Story = {
  args: {
    sync: ankiConnectSync({ hasSyncFailed: true, pendingDeletionCount: 2 }),
  },
};

export const SendingChangedFlashcardsToAnki: Story = {
  args: { sync: ankiConnectSync({ isSyncing: true }, { changedCount: 2 }) },
};

export const SendingToAnkiBeforeAnyFlashcardReachedAnki: Story = {
  args: {
    sync: ankiConnectSync(
      { isSyncing: true },
      { newCount: 12, hasBeenFlushed: false },
    ),
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

export const AnkiConnectedWithEveryFlashcardInAnki: Story = {
  args: {
    sync: { ...ankiConnectSync({}, { newCount: 0 }), nextCard: null },
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
