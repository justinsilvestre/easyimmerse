import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtureSyncLink } from "../testSupport/fixtureResponses.ts";
import { SyncStateLine } from "./SyncStateLine.tsx";

const meta = {
  title: "Account/SyncStateLine",
  component: SyncStateLine,
  args: { link: fixtureSyncLink },
} satisfies Meta<typeof SyncStateLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UpToDate: Story = {};

export const Synchronizing: Story = {
  args: { link: { ...fixtureSyncLink, state: { kind: "syncing" } } },
};

export const FirstCopy: Story = {
  args: {
    link: {
      ...fixtureSyncLink,
      state: { kind: "syncing" },
      last_synced_at_ms: null,
    },
  },
};

export const Unreachable: Story = {
  args: {
    link: {
      ...fixtureSyncLink,
      state: { kind: "unreachable", since_ms: Date.now() },
    },
  },
};

export const LoggedOut: Story = {
  args: { link: { ...fixtureSyncLink, state: { kind: "logged_out" } } },
};

/** A round the server answered in a way this app does not understand, as a server of another version might. */
export const Failed: Story = {
  args: {
    link: {
      ...fixtureSyncLink,
      state: {
        kind: "failed",
        code: "remote_protocol",
        message:
          "the remote answered /sync/pull with missing field `changes` at line 1 column 52",
      },
    },
  },
};
