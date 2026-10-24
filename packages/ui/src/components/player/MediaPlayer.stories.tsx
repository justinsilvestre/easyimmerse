import type { BackendClient, BackendRequest } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { ListMediaFilesResponse } from "@easyimmerse/types";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../../storybook/withDispatchedActions.tsx";
import type { FakeRoute } from "../../testSupport/createFakeBackendClient.ts";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import {
  fixtureMediaFiles,
  fixtureResponses,
} from "../../testSupport/fixtureResponses.ts";
import {
  copyPlaybackRoutes,
  directPlaybackRoutes,
  fakeServer,
  transcodePlaybackRoutes,
  unsupportedPlaybackRoutes,
} from "../../testSupport/mediaFixtureResponses.ts";
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

/** The sample video, at a path relative to the story's page, so that it resolves wherever Storybook is published. */
const sampleVideoUrl = "fixtures/sample.mp4";

/** Stands in for hls.js, which has no server to fetch from in Storybook, and plays the sample video instead. */
const withFakeHls: Decorator = (Story) => (
  <HlsLoaderContext
    value={async () => createFakeHls({ playsFrom: sampleVideoUrl }).Hls}
  >
    <Story />
  </HlsLoaderContext>
);

const meta = {
  title: "Components/Player/MediaPlayer",
  component: MediaPlayer,
  decorators: [
    withDispatchedActions(actions.openMediaFileRequested("p1", "m1")),
    withAppStore,
  ],
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

/** A file the server converts while it plays, as the player shows any file that is playing. */
export const Playing: Story = {
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
