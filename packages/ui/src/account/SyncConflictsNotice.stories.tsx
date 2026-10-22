import { actions } from "@easyimmerse/state";
import type { SyncConflict } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import { SyncConflictsNotice } from "./SyncConflictsNotice.tsx";

const conflicts: SyncConflict[] = [
  {
    id: "c3",
    description: "a flashcard in Spanish practice",
    kept: "other_device",
    detected_at_ms: 0,
  },
  {
    id: "c2",
    description: "the settings of Spanish practice",
    kept: "this_device",
    detected_at_ms: 0,
  },
  {
    id: "c1",
    description: "a media file in Spanish practice",
    kept: "deletion",
    detected_at_ms: 0,
  },
];

const meta = {
  title: "Account/SyncConflictsNotice",
  component: SyncConflictsNotice,
  decorators: [withAppStore],
  args: { conflicts, count: conflicts.length },
  parameters: {
    appStore: {
      server: builtInServerOn("desktop"),
      client: createBuiltInServerClient(null, {
        "DELETE /sync/conflicts": () => new Promise(() => undefined),
      }),
    },
  },
} satisfies Meta<typeof SyncConflictsNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneConflict: Story = {
  args: { conflicts: conflicts.slice(0, 1), count: 1 },
};

export const SeveralConflicts: Story = {};

/** More conflicts than the built-in server lists, which the notice counts. */
export const MoreThanListed: Story = {
  args: { count: 45 },
};

export const Dismissing: Story = {
  decorators: [withDispatchedActions(actions.syncConflictsDismissed())],
};
