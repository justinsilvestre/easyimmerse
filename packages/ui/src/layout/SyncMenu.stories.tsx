import { actions, type ServerConfig } from "@easyimmerse/state";
import type { SyncLinkState } from "@easyimmerse/types";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { INITIAL_VIEWPORTS } from "storybook/viewport";
import { exampleFlashcard } from "../components/flashcards/exampleFlashcard.ts";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureProject,
  fixtureResponses,
  fixtureSyncLink,
  fixtureSyncStatus,
} from "../testSupport/fixtureResponses.ts";
import { FooterBar } from "./FooterBar.tsx";
import { SyncMenu } from "./SyncMenu.tsx";

/** A backend that saves no flashcard, as one that runs offline cannot. */
const offlineSaves = createFakeBackendClient({
  ...fixtureResponses,
  "POST /projects/p1/flashcards": fakeFailure({
    status: "OFFLINE",
    message:
      "POST /projects/p1/flashcards needs a server, and none is configured.",
  }),
});

/** A server that fails to save any flashcard. */
const failingSaves = createFakeBackendClient({
  ...fixtureResponses,
  "POST /projects/p1/flashcards": fakeFailure({
    status: 500,
    message: "The server failed.",
  }),
});

/** A built-in server whose fixture projects are not backed up. */
const notBackedUp = createFakeBackendClient(fixtureResponses);

/** A built-in server whose projects are not backed up, because its link to the easyImmerse cloud is in the given state. */
const linkedIn = (state: SyncLinkState) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "GET /sync/status": fixtureSyncStatus({ ...fixtureSyncLink, state }),
  });

/** A built-in server whose link to the easyImmerse cloud last backed everything up two minutes ago. */
const backedUpToCloud = createFakeBackendClient({
  ...fixtureResponses,
  "GET /projects": { projects: [{ ...fixtureProject, is_backed_up: true }] },
  "GET /sync/status": fixtureSyncStatus({
    ...fixtureSyncLink,
    last_synced_at_ms: Date.now() - 120_000,
  }),
});

/** A desktop app's server reached over the local network with its launch token, with or without accounts, and with or without its computer's name. */
const pairedDesktop = (accounts: boolean, deviceName?: string) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "GET /auth/me": { kind: "launch" },
    "GET /auth/server": {
      accounts,
      open_signup: false,
      sends_email: false,
      device_name: deviceName,
    },
  });

const lanServer: ServerConfig = {
  serverUrl: "http://192.168.1.20:4000",
  token: "launch",
};

const accountServer: ServerConfig = {
  serverUrl: "https://books.example.org",
  token: "t",
};

const builtInServer = (bundledIn: "desktop" | "mobile"): ServerConfig => ({
  serverUrl: "http://127.0.0.1:4000",
  token: "launch",
  bundledIn,
});

const savedWord = actions.flashcardStarted(
  {
    id: "story-fressen",
    draft: {
      media_file_id: "m1",
      cue_index: 1,
      word_start: null,
      content: { ...exampleFlashcard, word: "fressen" },
      included_fields: ["word"],
    },
  },
  "save",
);

const savingWord = withDispatchedActions(
  actions.openMediaFileRequested("p1", "m1"),
  savedWord,
);

/** Draws the Sync button in the footer bar, with room above it for the popover it opens. */
const inFooter: Decorator = (Story) => (
  <div className="flex min-h-96 flex-col justify-end">
    <FooterBar syncMenu={<Story />} activities={[]} onOpenActivity={fn()} />
  </div>
);

const meta = {
  title: "Layout/SyncMenu",
  component: SyncMenu,
  decorators: [inFooter, withAppStore],
  args: { isInitiallyOpen: true },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SyncMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BrowserOnly: Story = {
  decorators: [savingWord],
  parameters: { appStore: { client: offlineSaves } },
};

export const FailedSaves: Story = {
  decorators: [savingWord],
  parameters: { appStore: { client: failingSaves, server: accountServer } },
};

export const DeviceOnlyDesktop: Story = {
  parameters: {
    appStore: {
      client: notBackedUp,
      server: builtInServer("desktop"),
      cloudUrl: "https://cloud.example.org",
    },
  },
};

export const DeviceOnlyMobile: Story = {
  parameters: {
    appStore: {
      client: notBackedUp,
      server: builtInServer("mobile"),
      cloudUrl: "https://cloud.example.org",
    },
  },
};

export const DeviceOnlyWithoutOfficialServer: Story = {
  parameters: {
    appStore: { client: notBackedUp, server: builtInServer("desktop") },
  },
};

/** At phone width, the popover is placed against the footer. */
export const DeviceOnlyOnAPhone: Story = {
  parameters: {
    viewport: { options: INITIAL_VIEWPORTS },
    appStore: {
      client: notBackedUp,
      server: builtInServer("mobile"),
      cloudUrl: "https://cloud.example.org",
    },
  },
  globals: { viewport: { value: "iphonex", isRotated: false } },
};

export const LinkUnreachable: Story = {
  parameters: {
    appStore: {
      client: linkedIn({ kind: "unreachable", since_ms: Date.now() - 600_000 }),
      server: builtInServer("desktop"),
      cloudUrl: "https://cloud.example.org",
    },
  },
};

export const LinkFailed: Story = {
  parameters: {
    appStore: {
      client: linkedIn({
        kind: "failed",
        code: "remote_protocol",
        message:
          "the remote answered /sync/pull with missing field `changes` at line 1 column 52",
      }),
      server: builtInServer("desktop"),
      cloudUrl: "https://cloud.example.org",
    },
  },
};

export const LoggedOut: Story = {
  parameters: {
    appStore: {
      client: linkedIn({ kind: "logged_out" }),
      server: builtInServer("desktop"),
      cloudUrl: "https://cloud.example.org",
    },
  },
};

/** Backed up to the easyImmerse cloud through the built-in server's link, with nothing more to do. */
export const BackedUpToCloud: Story = {
  parameters: {
    appStore: {
      client: backedUpToCloud,
      server: builtInServer("desktop"),
      cloudUrl: "https://cloud.example.org",
    },
  },
};

/** Logged in to a server directly, as the web app is, with no failed save. */
export const LoggedInToServer: Story = {
  parameters: { appStore: { server: accountServer } },
};

/** Paired with a desktop app whose server gives its computer's name. */
export const PairedWithDesktop: Story = {
  parameters: {
    appStore: {
      client: pairedDesktop(false, "X's MacBook Pro"),
      server: lanServer,
    },
  },
};

/** Paired with a desktop app whose server gives no name, so the status line names its address. */
export const PairedWithUnnamedDesktop: Story = {
  parameters: { appStore: { client: pairedDesktop(false), server: lanServer } },
};

/** Paired with a desktop app whose server has accounts, which the popover offers to log in to. */
export const PairedWithDesktopWithAccounts: Story = {
  parameters: { appStore: { client: pairedDesktop(true), server: lanServer } },
};

/** The closed button while the remote cannot be reached: the cloud in the warning colour. */
export const ClosedWithFault: Story = {
  args: { isInitiallyOpen: false },
  parameters: LinkUnreachable.parameters,
};

/** The closed button while the work is kept only on this computer: a plain monitor. */
export const ClosedOnThisComputer: Story = {
  args: { isInitiallyOpen: false },
  parameters: DeviceOnlyDesktop.parameters,
};
