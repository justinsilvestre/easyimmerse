import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";
import {
  ankiConnectOffAfterSendingSync,
  ankiConnectSync,
  deletionsListedSync,
  exportedSync,
  neverExportedSync,
  reviewSync,
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
    onReviewMore: fn(),
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
      queue: { ...exportedSync.queue, newCount: 0, changedCount: 0 },
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
      { newCount: 12, hasBeenSent: false },
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

export const AnkiConnectOffAfterSending: Story = {
  args: { sync: ankiConnectOffAfterSendingSync },
};

export const AnkiConnectOffAfterSendingEveryFlashcard: Story = {
  args: {
    sync: {
      ...ankiConnectOffAfterSendingSync,
      queue: { ...ankiConnectOffAfterSendingSync.queue, newCount: 0 },
      package: { deletions: [], ankiSearch: "" },
      nextCard: null,
    },
  },
};

export const ReviewsDue: Story = {
  args: { sync: reviewSync() },
};

export const OnlyNewCardsLeftToReview: Story = {
  args: { sync: reviewSync({ dueCount: 0 }) },
};

export const ReviewDoneForToday: Story = {
  args: {
    sync: reviewSync({
      dueCount: 0,
      newCount: 0,
      nextCard: null,
      nextDueAtMs: Date.now() + 24 * 60 * 60 * 1000,
    }),
  },
};

/** Every card is reviewed and nothing is scheduled, as when every answered card is suspended. */
export const ReviewCaughtUpWithNothingScheduled: Story = {
  args: {
    sync: reviewSync({ dueCount: 0, newCount: 0, nextCard: null }),
  },
};

/** The day's limit of reviews is reached, and more are due: they wait for later days unless the user reviews more now. */
export const ReviewDailyLimitReached: Story = {
  args: {
    sync: reviewSync({
      dueCount: 0,
      newCount: 0,
      heldBackCount: 140,
      moreReviewCount: 100,
      nextCard: null,
      nextDueAtMs: Date.now() - 2 * 24 * 60 * 60 * 1000,
    }),
  },
};
