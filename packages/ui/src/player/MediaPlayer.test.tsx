import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import type { BrowserFileRegistry } from "@easyimmerse/state";
import {
  actions,
  createBrowserFileRegistry,
  selectCurrentMediaFileId,
  selectCurrentTime,
  selectPlayer,
  selectPlayerDuration,
} from "@easyimmerse/state";
import type { ListMediaFilesResponse, MediaFile } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { type ReactNode, useCallback, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { createFakeHls } from "./fakeHls.ts";
import { HlsLoaderContext } from "./hlsLoaderContext.ts";
import { MediaPlayer } from "./MediaPlayer.tsx";
import { TrackChoiceContext } from "./trackChoiceContext.ts";

afterEach(() => {
  cleanup();
  resetBackend();
});

const episode = fixtureMediaFiles.media_files[0] as MediaFile;

/** The fixture list with the episode's track selection already saved. */
const withSavedSelection: ListMediaFilesResponse = {
  media_files: [{ ...episode, track_selection_json: '{"video":0,"audio":2}' }],
};

type RenderOptions = {
  mediaFiles?: ListMediaFilesResponse;
  mediaFileId?: string;
  offline?: boolean;
  browserFileRegistry?: BrowserFileRegistry<File>;
  /** Actions dispatched before the file opens. By default, the stored preferences arrive empty. */
  before?: ReturnType<(typeof actions)[keyof typeof actions]>[];
};

/** Stands in for the screen, which shows a Tracks button while the player offers a track choice. */
function TrackChoiceProbe({ children }: { children: ReactNode }) {
  const [openTracks, setOpenTracks] = useState<(() => void) | null>(null);
  const offer = useCallback(
    (open: (() => void) | null) => setOpenTracks(() => open),
    [],
  );
  return (
    <TrackChoiceContext value={offer}>
      {children}
      {openTracks && (
        <button type="button" onClick={openTracks}>
          Tracks
        </button>
      )}
    </TrackChoiceContext>
  );
}

function renderPlayer(
  routes: readonly FakeRoute[],
  options: RenderOptions = {},
) {
  const client = createFakeBackendClient(
    {
      ...fixtureResponses,
      "GET /projects/p1/media": options.mediaFiles ?? fixtureMediaFiles,
    },
    routes,
  );
  const fakeHls = createFakeHls();
  const rendered = renderWithAppStore(
    <HlsLoaderContext value={async () => fakeHls.Hls}>
      <TrackChoiceProbe>
        <MediaPlayer projectId="p1" />
      </TrackChoiceProbe>
    </HlsLoaderContext>,
    client,
    {
      server: options.offline ? undefined : fakeServer,
      browserFileRegistry: options.browserFileRegistry,
    },
  );
  act(() => {
    for (const action of options.before ?? [actions.preferencesLoaded({})])
      rendered.store.dispatch(action);
    rendered.store.dispatch(actions.openMedia(options.mediaFileId ?? "m1"));
  });
  return { ...rendered, client, hls: fakeHls.instances };
}

const findVideo = () =>
  screen.findByLabelText("Video") as Promise<HTMLVideoElement>;

const findAlertText = async () =>
  (await screen.findByRole("alert")).textContent;

function playbackRequests(requests: BackendRequest[]) {
  return requests.filter((request) => request.path.endsWith("/playback"));
}

function requestBody(request: BackendRequest | undefined): unknown {
  return request?.body?.kind === "json" ? request.body.value : undefined;
}

/** Lets the fake backend answer whatever has been asked so far. */
async function settleRequests() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
}

async function settleTracks(requests: BackendRequest[]) {
  await vi.waitFor(() =>
    expect(requests.some((request) => request.path.endsWith("/tracks"))).toBe(
      true,
    ),
  );
  await settleRequests();
}

/** The fixture's video runs at 24 fps, so a seek lands half of a 24th of a second late. */
const halfFrame = 1 / 48;

describe("MediaPlayer", () => {
  it("shows a loading line while the tracks load", () => {
    renderPlayer(directPlaybackRoutes);
    expect(screen.getByRole("status").textContent).toBe("Loading…");
  });

  describe("with a file that plays directly", () => {
    it("points the video at the stream URL", async () => {
      renderPlayer(directPlaybackRoutes);
      expect((await findVideo()).getAttribute("src")).toBe(
        "http://127.0.0.1:1/projects/p1/media/m1/stream?token=t0k3n",
      );
    });

    it("asks for frames from another origin", async () => {
      renderPlayer(directPlaybackRoutes);
      expect((await findVideo()).getAttribute("crossorigin")).toBe("anonymous");
    });

    it("refuses the browser's context menu on the video", async () => {
      renderPlayer(directPlaybackRoutes);
      expect(fireEvent.contextMenu(await findVideo())).toBe(false);
    });

    it("seeks half a frame past the asked time", async () => {
      const { playerRegistry } = renderPlayer(directPlaybackRoutes);
      const video = await findVideo();
      act(() => playerRegistry.current()?.seek(1));
      expect(video.currentTime).toBeCloseTo(1 + halfFrame, 9);
    });

    it("reports the element's time to the store", async () => {
      const { store } = renderPlayer(directPlaybackRoutes);
      const video = await findVideo();
      video.currentTime = 3;
      fireEvent.timeUpdate(video);
      expect(selectCurrentTime(store.getState())).toBe(3);
    });

    it("reports the element's duration to the store", async () => {
      const { store } = renderPlayer(directPlaybackRoutes);
      const video = await findVideo();
      Object.defineProperty(video, "duration", { value: 90 });
      fireEvent.durationChange(video);
      expect(selectPlayerDuration(store.getState())).toBe(90);
    });

    it("reports what the element has loaded to the store", async () => {
      const { store } = renderPlayer(directPlaybackRoutes);
      const video = await findVideo();
      Object.defineProperty(video, "buffered", {
        value: { length: 1, start: () => 0, end: () => 30 },
      });
      fireEvent.progress(video);
      expect(selectPlayer(store.getState()).buffered).toEqual([
        { startSeconds: 0, endSeconds: 30 },
      ]);
    });

    it("plays or pauses when the picture is clicked", async () => {
      const { effects } = renderPlayer(directPlaybackRoutes);
      fireEvent.click(await findVideo());
      expect(effects.calls).toContainEqual({ type: "togglePlayer" });
    });

    it("offers no track choice for a file with one track of each kind", async () => {
      renderPlayer(directPlaybackRoutes);
      await findVideo();
      expect(screen.queryByRole("button", { name: "Tracks" })).toBeNull();
    });

    it("shows a plain cause when the element fails", async () => {
      renderPlayer(directPlaybackRoutes);
      const video = await findVideo();
      Object.defineProperty(video, "error", { value: { code: 3 } });
      fireEvent.error(video);
      expect(await findAlertText()).toBe(
        "The media could not be played. The file could not be decoded.",
      );
    });
  });

  describe("with a file that is converted", () => {
    it("feeds hls.js the playlist URL", async () => {
      const { hls } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() =>
        expect(hls[0]?.sourceUrl).toBe(
          "http://127.0.0.1:1/conversions/copy0001/index.m3u8",
        ),
      );
    });

    it("sends the bearer header with hls.js requests", async () => {
      const { hls } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() =>
        expect(hls[0]?.authorizationHeader).toBe("Bearer t0k3n"),
      );
    });

    it("seeks half a frame past the asked time", async () => {
      const { hls, playerRegistry } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() => expect(hls[0]?.media).toBeTruthy());
      act(() => playerRegistry.current()?.seek(1));
      expect(hls[0]?.media?.currentTime).toBeCloseTo(1 + halfFrame, 9);
    });

    it("shows a plain cause when hls.js gives up", async () => {
      const { hls } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() => expect(hls[0]).toBeDefined());
      act(() =>
        hls[0]?.emitError({ type: "networkError", details: "x", fatal: true }),
      );
      expect(await findAlertText()).toBe(
        "The media could not be played. The converted stream could not be loaded from the server.",
      );
    });

    it("destroys hls.js when the media file closes", async () => {
      const { hls, store } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() => expect(hls[0]).toBeDefined());
      act(() => store.dispatch(actions.closeMedia()));
      expect(hls[0]?.destroyed).toBe(true);
    });
  });

  describe("conversion notice", () => {
    it("opens before a plan that re-encodes a track", async () => {
      renderPlayer(transcodePlaybackRoutes, { mediaFiles: withSavedSelection });
      expect(
        await screen.findByRole("dialog", {
          name: "This file will be converted as it plays",
        }),
      ).toBeDefined();
    });

    it("stays closed for a plan that only copies the tracks", async () => {
      const { hls } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() => expect(hls[0]).toBeDefined());
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("stays closed once the preference dismisses it", async () => {
      const { hls } = renderPlayer(transcodePlaybackRoutes, {
        mediaFiles: withSavedSelection,
        before: [
          actions.preferencesLoaded({ conversionNoticeDismissed: "true" }),
        ],
      });
      await vi.waitFor(() => expect(hls[0]).toBeDefined());
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("starts the stream when Play is clicked", async () => {
      const { hls } = renderPlayer(transcodePlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await screen.findByRole("dialog");
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      await vi.waitFor(() =>
        expect(hls[0]?.sourceUrl).toBe(
          "http://127.0.0.1:1/conversions/transcode01/index.m3u8",
        ),
      );
    });

    it("closes the media file when Cancel is clicked", async () => {
      const { store } = renderPlayer(transcodePlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await screen.findByRole("dialog");
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(selectCurrentMediaFileId(store.getState())).toBeNull();
    });
  });

  describe("track choice", () => {
    it("opens before the first play when a kind has several tracks and no saved choice", async () => {
      renderPlayer(copyPlaybackRoutes);
      expect(
        await screen.findByRole("dialog", { name: "Choose tracks" }),
      ).toBeDefined();
    });

    it("holds the playback request until the choice is made", async () => {
      const { client } = renderPlayer(copyPlaybackRoutes);
      await screen.findByRole("dialog", { name: "Choose tracks" });
      expect(playbackRequests(client.requests)).toHaveLength(0);
    });

    it("stays closed when a choice is saved", async () => {
      const { hls } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() => expect(hls[0]).toBeDefined());
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("sends the saved choice with the playback request", async () => {
      const { client } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() =>
        expect(playbackRequests(client.requests)).toHaveLength(1),
      );
      expect(requestBody(playbackRequests(client.requests)[0])).toMatchObject({
        selection: { video: 0, audio: 2 },
      });
    });

    it("saves the choice through the server", async () => {
      const { client } = renderPlayer(copyPlaybackRoutes);
      await screen.findByRole("dialog", { name: "Choose tracks" });
      fireEvent.click(screen.getByRole("radio", { name: /English/ }));
      fireEvent.click(screen.getByRole("button", { name: "Choose" }));
      await vi.waitFor(() =>
        expect(
          client.requests.find((request) => request.method === "PUT"),
        ).toMatchObject({
          path: "/projects/p1/media/m1/track-selection",
          body: { kind: "json", value: { video: 0, audio: 2 } },
        }),
      );
    });

    it("plays the chosen tracks", async () => {
      const { client } = renderPlayer(copyPlaybackRoutes);
      await screen.findByRole("dialog", { name: "Choose tracks" });
      fireEvent.click(screen.getByRole("radio", { name: /English/ }));
      fireEvent.click(screen.getByRole("button", { name: "Choose" }));
      await vi.waitFor(() =>
        expect(playbackRequests(client.requests)).toHaveLength(1),
      );
      expect(requestBody(playbackRequests(client.requests)[0])).toMatchObject({
        selection: { video: 0, audio: 2 },
      });
    });

    it("plays the default tracks when the choice is cancelled", async () => {
      const { client } = renderPlayer(copyPlaybackRoutes);
      await screen.findByRole("dialog", { name: "Choose tracks" });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await vi.waitFor(() =>
        expect(playbackRequests(client.requests)).toHaveLength(1),
      );
      expect(requestBody(playbackRequests(client.requests)[0])).toMatchObject({
        selection: null,
      });
    });

    it("reopens from the Tracks button", async () => {
      const { hls } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() => expect(hls[0]).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: "Tracks" }));
      expect(
        screen.getByRole("dialog", { name: "Choose tracks" }),
      ).toBeDefined();
    });

    it("leaves playback alone when the Tracks button is clicked", async () => {
      const { effects, hls } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() => expect(hls[0]).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: "Tracks" }));
      expect(effects.calls).not.toContainEqual({ type: "togglePlayer" });
    });

    it("asks for a new plan when the tracks change", async () => {
      const { client, hls } = renderPlayer(copyPlaybackRoutes, {
        mediaFiles: withSavedSelection,
      });
      await vi.waitFor(() => expect(hls[0]).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: "Tracks" }));
      fireEvent.click(screen.getByRole("radio", { name: /Japanese/ }));
      fireEvent.click(screen.getByRole("button", { name: "Choose" }));
      await vi.waitFor(() =>
        expect(playbackRequests(client.requests)).toHaveLength(2),
      );
      expect(requestBody(playbackRequests(client.requests)[1])).toMatchObject({
        selection: { video: 0, audio: 1 },
      });
    });
  });

  describe("preferences", () => {
    it("asks for FLAC when lossless audio is preferred", async () => {
      const { client } = renderPlayer(directPlaybackRoutes, {
        before: [actions.preferencesLoaded({ losslessAudio: "true" })],
      });
      await findVideo();
      expect(requestBody(playbackRequests(client.requests)[0])).toMatchObject({
        preferred_audio_target: "flac",
      });
    });

    it("asks for FLAC when the preference loads after the file opens", async () => {
      const { client, store } = renderPlayer(directPlaybackRoutes, {
        before: [],
      });
      await settleTracks(client.requests);
      act(() => {
        store.dispatch(actions.preferencesLoaded({ losslessAudio: "true" }));
      });
      await findVideo();
      expect(requestBody(playbackRequests(client.requests)[0])).toMatchObject({
        preferred_audio_target: "flac",
      });
    });

    it("keeps the playing file's plan when the preference changes", async () => {
      const { client, store } = renderPlayer(directPlaybackRoutes);
      await findVideo();
      act(() => {
        store.dispatch(actions.preferenceSet("losslessAudio", "true"));
      });
      await settleRequests();
      expect(playbackRequests(client.requests)).toHaveLength(1);
    });

    it("leaves the audio target to the server otherwise", async () => {
      const { client } = renderPlayer(directPlaybackRoutes);
      await findVideo();
      expect(requestBody(playbackRequests(client.requests)[0])).toMatchObject({
        preferred_audio_target: null,
      });
    });

    it("sends the measured environment", async () => {
      const { client } = renderPlayer(directPlaybackRoutes);
      await findVideo();
      expect(requestBody(playbackRequests(client.requests)[0])).toMatchObject({
        environment: {
          engine: expect.stringMatching(/webkit|chromium|gecko/),
          can_play_type: "no",
          mse_codec_strings: [],
        },
      });
    });
  });

  describe("failures", () => {
    it("explains an unsupported plan in plain words", async () => {
      renderPlayer(unsupportedPlaybackRoutes);
      expect(await findAlertText()).toBe(
        "The media could not be played. This video's picture is too tall to convert.",
      );
    });

    it("explains that a file on disk needs a server", async () => {
      renderPlayer(directPlaybackRoutes, { offline: true });
      expect(await findAlertText()).toContain("no server is connected");
    });

    it("passes the server's message through when a route is missing", async () => {
      renderPlayer([]);
      expect(await findAlertText()).toContain(
        "No canned GET /projects/p1/media/m1/tracks",
      );
    });

    it("closes the file from the failure's way back to the project", async () => {
      const { store } = renderPlayer(unsupportedPlaybackRoutes);
      fireEvent.click(
        await screen.findByRole("button", { name: "Back to the project" }),
      );
      expect(selectCurrentMediaFileId(store.getState())).toBeNull();
    });
  });

  describe("with a file the browser holds", () => {
    function registryHolding(file: File | null) {
      const registry = createBrowserFileRegistry<File>();
      const source =
        file === null
          ? { kind: "browser_file" as const, size: 1, last_modified_ms: 1 }
          : registry.register(file);
      const mediaFiles: ListMediaFilesResponse = {
        media_files: [
          {
            id: "m2",
            project_id: "p1",
            name: "interview.mp3",
            source,
            created_at_ms: 1,
            track_selection_json: null,
          },
        ],
      };
      return { registry, mediaFiles };
    }

    const audioFile = () =>
      new File([new Uint8Array([1, 2, 3])], "interview.mp3", {
        lastModified: 5,
      });

    it("plays from a blob URL", async () => {
      const { registry, mediaFiles } = registryHolding(audioFile());
      renderPlayer([], {
        mediaFiles,
        mediaFileId: "m2",
        browserFileRegistry: registry,
      });
      const element = await screen.findByLabelText("Audio");
      expect(element.getAttribute("src")).toMatch(/^blob:/);
    });

    it("never asks the server how to play it", async () => {
      const { registry, mediaFiles } = registryHolding(audioFile());
      const { client } = renderPlayer([], {
        mediaFiles,
        mediaFileId: "m2",
        browserFileRegistry: registry,
      });
      await screen.findByLabelText("Audio");
      expect(client.requests.map((request) => request.path)).not.toContain(
        "/projects/p1/media/m2/tracks",
      );
    });

    it("plays or pauses when the artwork is clicked", async () => {
      const { registry, mediaFiles } = registryHolding(audioFile());
      const { effects } = renderPlayer([], {
        mediaFiles,
        mediaFileId: "m2",
        browserFileRegistry: registry,
      });
      await screen.findByLabelText("Audio");
      fireEvent.click(screen.getByText("interview.mp3"));
      expect(effects.calls).toContainEqual({ type: "togglePlayer" });
    });

    it("explains when the browser no longer holds the file", async () => {
      const { registry, mediaFiles } = registryHolding(null);
      renderPlayer([], {
        mediaFiles,
        mediaFileId: "m2",
        browserFileRegistry: registry,
      });
      expect(await findAlertText()).toContain("no longer open in the browser");
    });

    it("explains when the platform has no browser files at all", async () => {
      const { mediaFiles } = registryHolding(null);
      renderPlayer([], { mediaFiles, mediaFileId: "m2" });
      expect(await findAlertText()).toContain("this app cannot reach it");
    });
  });
});
