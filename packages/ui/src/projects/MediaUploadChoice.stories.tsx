import { useListMediaFilesQuery } from "@easyimmerse/backend";
import { actions, createBrowserFileRegistry } from "@easyimmerse/state";
import type { SyncLink } from "@easyimmerse/types";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import { fixtureSyncLink } from "../testSupport/fixtureResponses.ts";
import {
  accountServer,
  createAccountServerClient,
  fixtureStorageStatus,
} from "../testSupport/storageFixtures.ts";
import { MediaUploadChoice } from "./MediaUploadChoice.tsx";
import type { MediaCopy } from "./mediaCopyOf.ts";

const never = () => new Promise(() => undefined);

const notKept: MediaCopy = {
  projectId: "p1",
  isUploadChosen: false,
  hasStoredCopy: false,
  browserFile: null,
  isUnreadableHere: false,
};

/** The desktop app's built-in server, linked to the easyImmerse cloud as the link given tells. */
const onBuiltInServer = (link: SyncLink = fixtureSyncLink) => ({
  appStore: {
    server: builtInServerOn("desktop"),
    client: createBuiltInServerClient(link, {
      "PUT /projects/p1/media/m1/upload-choice": never,
      "POST /projects/p1/media/m1/stored-copy/fetch": never,
    }),
  },
});

/** A browser that holds every file it is asked about. */
const holdingAll = {
  ...createBrowserFileRegistry<File>(),
  find: (name: string) => new File([], name),
};

/** The web app connected as an account to a server that keeps copies of media files. */
const onAccountServer = {
  appStore: {
    server: accountServer,
    browserFileRegistry: holdingAll,
    client: createAccountServerClient(fixtureStorageStatus([]), {
      "PUT /projects/p1/media/m2/stored-copy": never,
      "PUT /projects/p1/media/m2/upload-choice": never,
    }),
  },
};

/** Renders the story once the project's media list is cached, as the project screen has it, so that an upload finds its file. */
const afterMediaList: Decorator = (Story) => (
  <AfterMediaList>
    <Story />
  </AfterMediaList>
);

function AfterMediaList({ children }: { children: ReactNode }) {
  return useListMediaFilesQuery("p1").data ? children : null;
}

const meta = {
  title: "Projects/MediaUploadChoice",
  component: MediaUploadChoice,
  decorators: [withAppStore],
  args: { mediaFileId: "m1", copy: notKept },
  parameters: onBuiltInServer(),
} satisfies Meta<typeof MediaUploadChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotKept: Story = {};

export const Kept: Story = {
  args: { copy: { ...notKept, isUploadChosen: true } },
};

export const Uploading: Story = {
  args: { copy: { ...notKept, isUploadChosen: true } },
  parameters: onBuiltInServer({
    ...fixtureSyncLink,
    state: { kind: "syncing" },
    transfer: {
      media_file_id: "m1",
      name: "episode.mkv",
      sent_bytes: 400,
      total_bytes: 1000,
    },
  }),
};

/** The remote keeps a copy of a file this device cannot read. */
export const DownloadOffered: Story = {
  args: { copy: { ...notKept, isUploadChosen: true, isUnreadableHere: true } },
};

export const Downloading: Story = {
  args: DownloadOffered.args,
  decorators: [
    withDispatchedActions(actions.storedCopyFetchRequested("p1", "m1")),
  ],
};

export const UploadOffered: Story = {
  args: { mediaFileId: "m2", copy: { ...notKept, browserFile: "held" } },
  parameters: onAccountServer,
};

export const UploadingFromBrowser: Story = {
  args: UploadOffered.args,
  parameters: onAccountServer,
  decorators: [
    withDispatchedActions(actions.storedCopyUploadRequested("p1", "m2")),
    afterMediaList,
  ],
};

/** The browser no longer holds the file, as after the page was reloaded. */
export const UploadUnavailable: Story = {
  args: { mediaFileId: "m2", copy: { ...notKept, browserFile: "gone" } },
  parameters: onAccountServer,
};

export const KeptOnServer: Story = {
  args: {
    mediaFileId: "m2",
    copy: {
      ...notKept,
      browserFile: "gone",
      isUploadChosen: true,
      hasStoredCopy: true,
    },
  },
  parameters: onAccountServer,
};

export const Removing: Story = {
  args: KeptOnServer.args,
  parameters: onAccountServer,
  decorators: [
    withDispatchedActions(actions.uploadChoiceToggled("p1", "m2", false)),
  ],
};
