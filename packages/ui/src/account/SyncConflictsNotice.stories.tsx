import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import {
  fixtureOlderSyncConflicts,
  fixtureSyncConflicts,
} from "../testSupport/fixtureSyncConflicts.ts";
import { SyncConflictsNotice } from "./SyncConflictsNotice.tsx";

const allConflicts = [...fixtureSyncConflicts, ...fixtureOlderSyncConflicts];

const meta = {
  title: "Account/SyncConflictsNotice",
  component: SyncConflictsNotice,
  decorators: [withAppStore],
  args: { conflicts: fixtureSyncConflicts, count: fixtureSyncConflicts.length },
  parameters: {
    appStore: {
      server: builtInServerOn("desktop"),
      client: createBuiltInServerClient(null, {
        "DELETE /sync/conflicts": () => new Promise(() => undefined),
        "GET /sync/conflicts": { conflicts: allConflicts },
      }),
    },
  },
} satisfies Meta<typeof SyncConflictsNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneConflict: Story = {
  args: { conflicts: fixtureSyncConflicts.slice(0, 1), count: 1 },
};

/** Conflicts in two projects, under their media files, and one of no project. */
export const SeveralConflicts: Story = {};

/** More conflicts than the built-in server lists, which a button offers to show. */
export const MoreThanListed: Story = {
  args: { count: allConflicts.length },
};

/** Every conflict, after the person asked to show them all. */
export const AllShown: Story = {
  args: { count: allConflicts.length },
  decorators: [withDispatchedActions(actions.allSyncConflictsShown())],
};

export const Dismissing: Story = {
  decorators: [withDispatchedActions(actions.syncConflictsDismissed())],
};
