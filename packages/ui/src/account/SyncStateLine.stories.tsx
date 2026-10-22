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

export const Failed: Story = {
  args: {
    link: {
      ...fixtureSyncLink,
      state: {
        kind: "failed",
        code: "forbidden",
        message: "This account may not keep a copy of its work on this server.",
      },
    },
  },
};
