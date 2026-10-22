import { actions, type ServerConfig } from "@easyimmerse/state";
import type { SyncLinkState } from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppFooter } from "../components/AppFooter.tsx";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
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

/** A built-in server whose projects have all been copied to a linked server. */
const allBackedUp = createFakeBackendClient({
  ...fixtureResponses,
  "GET /projects": { projects: [{ ...fixtureProject, is_backed_up: true }] },
});

/** A built-in server whose fixture projects are not backed up. */
const notBackedUp = createFakeBackendClient(fixtureResponses);

/** A built-in server whose projects are not backed up, because its link to the easyImmerse cloud is in the given state. */
const linkedIn = (state: SyncLinkState) =>
  createFakeBackendClient({
    ...fixtureResponses,
    "GET /sync/status": fixtureSyncStatus({ ...fixtureSyncLink, state }),
  });

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

/** A screen with the app's footer at its bottom, where the sign shows. */
function ScreenWithFooter() {
  return (
    <div className="flex h-screen flex-col">
      <p className="flex-1 p-4 text-fg-muted">The screen above.</p>
      <AppFooter />
    </div>
  );
}

const meta = {
  title: "Account/NotBackedUpSign",
  component: ScreenWithFooter,
  decorators: [withAppStore],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ScreenWithFooter>;

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

export const LinkFailing: Story = {
  parameters: {
    appStore: {
      client: linkedIn({ kind: "unreachable", since_ms: Date.now() - 600_000 }),
      server: builtInServer("desktop"),
      cloudUrl: "https://cloud.example.org",
    },
  },
};

export const LinkRefused: Story = {
  parameters: {
    appStore: {
      client: linkedIn({
        kind: "failed",
        code: "quota_exceeded",
        message: "The account has no room left.",
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

export const Hidden: Story = {
  parameters: {
    appStore: { client: allBackedUp, server: builtInServer("desktop") },
  },
};
