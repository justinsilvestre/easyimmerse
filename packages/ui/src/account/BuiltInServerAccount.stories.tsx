import { actions, type NativePlatform } from "@easyimmerse/state";
import type { SyncConflict, SyncLink } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import type { FakeResponse } from "../testSupport/createFakeBackendClient.ts";
import { fixtureSyncLink } from "../testSupport/fixtureResponses.ts";
import { BuiltInServerAccount } from "./BuiltInServerAccount.tsx";

const cloudUrl = "https://cloud.example.org";

const never = () => new Promise(() => undefined);

const minuteMs = 60 * 1000;

/** A link to the easyImmerse cloud that last finished copying a few minutes ago. */
const linked: SyncLink = {
  ...fixtureSyncLink,
  last_synced_at_ms: Date.now() - 4 * minuteMs,
};

const conflicts: SyncConflict[] = [
  {
    id: "c3",
    description: "a flashcard in Spanish practice",
    kept: "other_device",
    detected_at_ms: Date.now() - minuteMs,
  },
  {
    id: "c2",
    description: "the settings of Spanish practice",
    kept: "this_device",
    detected_at_ms: Date.now() - 2 * minuteMs,
  },
  {
    id: "c1",
    description: "a review answer in Spanish practice",
    kept: "deletion",
    detected_at_ms: Date.now() - 3 * minuteMs,
  },
];

/** The desktop app's built-in server, which reports the given link and gives the other answers given. */
const builtInServer = (
  link: SyncLink | null,
  answers: Record<string, FakeResponse> = {},
  platform: NativePlatform = "desktop",
) => ({
  appStore: {
    server: builtInServerOn(platform),
    cloudUrl,
    client: createBuiltInServerClient(link, {
      "POST /sync/link": never,
      "DELETE /sync/link": never,
      "POST /sync/run": never,
      "DELETE /sync/conflicts": never,
      ...answers,
    }),
  },
});

const filledIn = actions.signInFormChanged({
  email: "someone@example.org",
  password: "correct horse",
});

const cloudAnswered = actions.serverAuthInfoReceived(cloudUrl, {
  accounts: true,
  open_signup: true,
  sends_email: false,
});

const loggedOut: SyncLink = { ...linked, state: { kind: "logged_out" } };

const meta = {
  title: "Account/BuiltInServerAccount",
  component: BuiltInServerAccount,
  decorators: [withAppStore],
  parameters: builtInServer(null),
} satisfies Meta<typeof BuiltInServerAccount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotLinked: Story = {};

export const NotLinkedOnMobile: Story = {
  parameters: builtInServer(null, {}, "mobile"),
};

/** A build that knows of no easyImmerse cloud, which offers only the person's own server. */
export const NotLinkedWithoutCloud: Story = {
  parameters: {
    appStore: { ...builtInServer(null).appStore, cloudUrl: undefined },
  },
};

export const Linking: Story = {
  decorators: [
    withDispatchedActions(filledIn, actions.signInSubmitted(), cloudAnswered),
  ],
};

export const LinkingFailed: Story = {
  decorators: [
    withDispatchedActions(
      filledIn,
      actions.signInSubmitted(),
      actions.signInFailed({
        status: 502,
        code: "remote_unreachable",
        message: "The remote could not be reached.",
      }),
    ),
  ],
};

export const FirstSync: Story = {
  parameters: builtInServer({
    ...fixtureSyncLink,
    state: { kind: "syncing" },
    last_synced_at_ms: null,
  }),
};

export const Linked: Story = {
  parameters: builtInServer(linked),
};

export const Synchronizing: Story = {
  parameters: builtInServer({ ...linked, state: { kind: "syncing" } }),
};

/** A round that copied everything but one media file, which did not fit in the account's room on the server. */
export const UploadRefused: Story = {
  parameters: builtInServer({
    ...linked,
    refused_upload: {
      media_file_id: "m1",
      name: "Episode 4.mp4",
      code: "quota_exceeded",
      message:
        "the copy takes 734003200 bytes, and only 52428800 bytes are free",
    },
  }),
};

export const LinkedAsAdministrator: Story = {
  parameters: builtInServer({ ...linked, account_role: "administrator" }),
};

export const LinkedOnMobile: Story = {
  parameters: builtInServer(linked, {}, "mobile"),
};

export const LoggingOut: Story = {
  parameters: builtInServer(linked),
  decorators: [withDispatchedActions(actions.signOutRequested())],
};

export const WithConflicts: Story = {
  parameters: builtInServer({
    ...linked,
    conflicts,
    conflict_count: conflicts.length,
  }),
};

export const Unreachable: Story = {
  parameters: builtInServer({
    ...linked,
    state: { kind: "unreachable", since_ms: linked.last_synced_at_ms ?? 0 },
  }),
};

export const TryingAgain: Story = {
  parameters: Unreachable.parameters,
  decorators: [withDispatchedActions(actions.syncRunRequested())],
};

export const LoggedOut: Story = {
  parameters: builtInServer(loggedOut),
};

export const LoggingInAgain: Story = {
  parameters: builtInServer(loggedOut),
  decorators: [
    withDispatchedActions(
      actions.relinkRequested(loggedOut.server_url, loggedOut.account_email),
    ),
  ],
};

export const Failed: Story = {
  parameters: builtInServer({
    ...linked,
    state: {
      kind: "failed",
      code: "forbidden",
      message: "This account may not keep a copy of its work on this server.",
    },
  }),
};
