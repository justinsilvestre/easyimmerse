import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../../storybook/withDispatchedActions.tsx";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../../testSupport/createBuiltInServerClient.ts";
import type { FakeResponse } from "../../testSupport/createFakeBackendClient.ts";
import { fixtureSyncLink } from "../../testSupport/fixtureResponses.ts";
import {
  accountServer,
  createAccountServerClient,
  fixtureStorageStatus,
  fixtureStoredCopies,
} from "../../testSupport/storageFixtures.ts";
import { CloudStorageSection } from "./CloudStorageSection.tsx";

const never = () => new Promise(() => undefined);

/** A server the web app is connected to as an account, which reports the storage status given. */
const onAccountServer = (storage: FakeResponse) => ({
  appStore: {
    server: accountServer,
    client: createAccountServerClient(storage, {
      "PUT /projects/p1/media/m1/upload-choice": never,
    }),
  },
});

const meta = {
  title: "Screens/Settings/CloudStorageSection",
  component: CloudStorageSection,
  decorators: [withAppStore],
  parameters: onAccountServer(fixtureStorageStatus(fixtureStoredCopies)),
} satisfies Meta<typeof CloudStorageSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFiles: Story = {};

export const Empty: Story = {
  parameters: onAccountServer(fixtureStorageStatus([])),
};

export const NearQuota: Story = {
  parameters: onAccountServer(
    fixtureStorageStatus(fixtureStoredCopies, 1_700_000_000),
  ),
};

export const WithoutQuota: Story = {
  parameters: onAccountServer(fixtureStorageStatus(fixtureStoredCopies, null)),
};

/** A server that keeps no copies of media files, as one without an uploads directory. */
export const Unavailable: Story = {
  parameters: onAccountServer(fixtureStorageStatus([], 0)),
};

export const ConfirmingDeletion: Story = {
  decorators: [withDispatchedActions(actions.storedCopyDeletionAsked("m1"))],
};

export const Deleting: Story = {
  decorators: [
    withDispatchedActions(actions.uploadChoiceToggled("p1", "m1", false)),
  ],
};

/** The desktop app, whose built-in server is linked to the easyImmerse cloud. */
export const OnBuiltInServer: Story = {
  parameters: {
    appStore: {
      server: builtInServerOn("desktop"),
      client: createBuiltInServerClient(fixtureSyncLink, {
        "GET /sync/remote/storage": fixtureStorageStatus(fixtureStoredCopies),
      }),
    },
  },
};
