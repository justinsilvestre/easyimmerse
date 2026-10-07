import type { BackendClient, BackendRequest } from "@easyimmerse/backend";
import { actions, createBrowserFileRegistry } from "@easyimmerse/state";
import type {
  ListMediaFilesResponse,
  MediaFileSource,
} from "@easyimmerse/types";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import type { FakeRoute } from "../testSupport/createFakeBackendClient.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureMediaFiles,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import {
  copyPlaybackRoutes,
  directPlaybackRoutes,
  fakeServer,
  transcodePlaybackRoutes,
  unsupportedPlaybackRoutes,
} from "../testSupport/mediaFixtureResponses.ts";
import { createFakeHls } from "./fakeHls.ts";
import { HlsLoaderContext } from "./hlsLoaderContext.ts";
import { MediaPlayer } from "./MediaPlayer.tsx";

const episode = fixtureMediaFiles.media_files[0];

const withSavedSelection: ListMediaFilesResponse = {
  media_files: episode
    ? [{ ...episode, track_selection_json: '{"video":0,"audio":2}' }]
    : [],
};

function clientFor(
  routes: readonly FakeRoute[],
  mediaFiles: ListMediaFilesResponse = fixtureMediaFiles,
): BackendClient {
  return createFakeBackendClient(
    { ...fixtureResponses, "GET /projects/p1/media": mediaFiles },
    routes,
  );
}

/** Answers everything but the tracks route, which never comes back. */
function clientWithHangingTracks(): BackendClient {
  const inner = clientFor(directPlaybackRoutes);
  return {
    send: (request: BackendRequest) =>
      request.path.endsWith("/tracks")
        ? new Promise(() => undefined)
        : inner.send(request),
  };
}

/** Stands in for hls.js, which has no server to fetch from in Storybook. */
const withFakeHls: Decorator = (Story) => (
  <HlsLoaderContext value={async () => createFakeHls().Hls}>
    <Story />
  </HlsLoaderContext>
);

const browserFiles = createBrowserFileRegistry<File>();
let heldSource: MediaFileSource = {
  kind: "browser_file",
  size: 0,
  last_modified_ms: 0,
};

const browserFileClient = createFakeBackendClient({
  ...fixtureResponses,
  "GET /projects/p1/media": (): ListMediaFilesResponse => ({
    media_files: [
      {
        id: "m2",
        project_id: "p1",
        name: "sample.mp4",
        source: heldSource,
        created_at_ms: 0,
        track_selection_json: null,
        origin: null,
      },
    ],
  }),
});

/** Fetches the sample video into a File and registers it as a browser-held media file before the story renders. */
function FixtureFileLoader({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch("/fixtures/sample.mp4")
      .then((response) => response.blob())
      .then((blob) => {
        const file = new File([blob], "sample.mp4", { lastModified: 1 });
        heldSource = browserFiles.register(file);
        setLoaded(true);
      });
  }, []);
  return loaded ? children : null;
}

const withFixtureFile: Decorator = (Story) => (
  <FixtureFileLoader>
    <Story />
  </FixtureFileLoader>
);

const meta = {
  title: "Player/MediaPlayer",
  component: MediaPlayer,
  decorators: [withDispatchedActions(actions.openMedia("m1")), withAppStore],
  parameters: { layout: "padded" },
  args: { projectId: "p1" },
} satisfies Meta<typeof MediaPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: {
    appStore: { client: clientWithHangingTracks(), server: fakeServer },
  },
};

export const DirectFromBrowserFile: Story = {
  decorators: [withDispatchedActions(actions.openMedia("m2")), withFixtureFile],
  parameters: {
    appStore: { client: browserFileClient, browserFileRegistry: browserFiles },
  },
};

export const Converting: Story = {
  decorators: [withFakeHls],
  parameters: {
    appStore: {
      client: clientFor(copyPlaybackRoutes, withSavedSelection),
      server: fakeServer,
    },
  },
};

export const ChooseTracks: Story = {
  decorators: [withFakeHls],
  parameters: {
    appStore: { client: clientFor(copyPlaybackRoutes), server: fakeServer },
  },
};

export const ConversionNotice: Story = {
  decorators: [withFakeHls],
  parameters: {
    appStore: {
      client: clientFor(transcodePlaybackRoutes, withSavedSelection),
      server: fakeServer,
    },
  },
};

export const Unsupported: Story = {
  parameters: {
    appStore: {
      client: clientFor(unsupportedPlaybackRoutes),
      server: fakeServer,
    },
  },
};

export const NoServer: Story = {
  parameters: { appStore: { client: clientFor(directPlaybackRoutes) } },
};

export const RouteMissing: Story = {
  parameters: { appStore: { client: clientFor([]), server: fakeServer } },
};
