import { resetBackend } from "@easyimmerse/backend";
import type { MediaPlayback } from "@easyimmerse/state";
import { selectPlayer } from "@easyimmerse/state";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaPlayer } from "../components/MediaPlayer.tsx";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";

type ErrorHandler = (
  event: string,
  data: { fatal: boolean; type: string; details: string },
) => void;

/** Records what the player does with hls.js, which the mock below replaces. */
const hls = vi.hoisted(() => {
  const recorded = {
    /** Counts reads of the module's default export, one for each time the player imports hls.js. */
    imports: 0,
    supported: true,
    instances: [] as FakeHls[],
  };
  class FakeHls {
    static Events = { ERROR: "hlsError" };
    static ErrorTypes = {
      NETWORK_ERROR: "networkError",
      MEDIA_ERROR: "mediaError",
    };
    static isSupported = () => recorded.supported;
    config: { xhrSetup?: (xhr: XMLHttpRequest, url: string) => void };
    errorHandlers: ErrorHandler[] = [];
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    recoverMediaError = vi.fn();
    constructor(config: FakeHls["config"]) {
      this.config = config;
      recorded.instances.push(this);
    }
    on(_event: string, handler: ErrorHandler) {
      this.errorHandlers.push(handler);
    }
  }
  return { recorded, FakeHls };
});

vi.mock("hls.js", () => ({
  get default() {
    hls.recorded.imports += 1;
    return hls.FakeHls;
  },
}));

const stream: MediaPlayback = {
  kind: "hls",
  url: "http://127.0.0.1:8787/conversions/k1/index.m3u8",
  token: "secret",
};

beforeEach(() => {
  hls.recorded.imports = 0;
  hls.recorded.supported = true;
  hls.recorded.instances = [];
});

afterEach(() => {
  cleanup();
  resetBackend();
});

/** Renders the player and waits for the lazily imported hls.js to attach. */
async function renderPlayer(playback: MediaPlayback = stream) {
  const rendered = renderWithAppStore(
    <MediaPlayer kind="video" playback={playback} />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  return rendered;
}

/** Renders the player with the stream and returns a function that rerenders it with another playback. */
async function renderRerenderablePlayer() {
  const { store, playerRegistry } = createTestAppStore();
  const renderWith = (playback: MediaPlayback) => (
    <AppStoreProviders store={store} playerRegistry={playerRegistry}>
      <MediaPlayer kind="video" playback={playback} />
    </AppStoreProviders>
  );
  const { rerender } = render(renderWith(stream));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  return (playback: MediaPlayback) => rerender(renderWith(playback));
}

function readInstance() {
  const instance = hls.recorded.instances[0];
  if (instance === undefined) throw new Error("No Hls instance was created.");
  return instance;
}

function emitError(data: Parameters<ErrorHandler>[1]) {
  act(() => {
    for (const handler of readInstance().errorHandlers)
      handler("hlsError", data);
  });
}

const fatalNetworkError = {
  fatal: true,
  type: "networkError",
  details: "manifestLoadError",
};
const fatalMediaError = {
  fatal: true,
  type: "mediaError",
  details: "bufferAppendError",
};

function readAuthorizationHeader(): string | undefined {
  const headers = new Map<string, string>();
  const xhr = {
    setRequestHeader: (name: string, value: string) => headers.set(name, value),
  } as unknown as XMLHttpRequest;
  readInstance().config.xhrSetup?.(xhr, stream.url);
  return headers.get("Authorization");
}

describe("useHlsPlayback", () => {
  it("sends the token as a bearer token with each request", async () => {
    await renderPlayer();
    expect(readAuthorizationHeader()).toBe("Bearer secret");
  });

  it("loads the stream's URL", async () => {
    await renderPlayer();
    expect(readInstance().loadSource).toHaveBeenCalledWith(stream.url);
  });

  it("attaches the stream to the video element", async () => {
    await renderPlayer();
    expect(readInstance().attachMedia).toHaveBeenCalledWith(
      document.querySelector("video"),
    );
  });

  it("destroys the stream on unmount", async () => {
    await renderPlayer();
    cleanup();
    expect(readInstance().destroy).toHaveBeenCalled();
  });

  it("destroys the stream when the playback changes", async () => {
    const rerenderPlayer = await renderRerenderablePlayer();
    rerenderPlayer({ ...stream, url: "http://127.0.0.1:8787/other.m3u8" });
    expect(readInstance().destroy).toHaveBeenCalled();
  });

  it("keeps the stream when rerendered with an equal playback", async () => {
    const rerenderPlayer = await renderRerenderablePlayer();
    rerenderPlayer({ ...stream });
    expect(readInstance().destroy).not.toHaveBeenCalled();
  });

  it("creates no stream when unmounted before hls.js loads", async () => {
    renderWithAppStore(<MediaPlayer kind="video" playback={stream} />);
    cleanup();
    await vi.dynamicImportSettled();
    expect(hls.recorded.instances).toHaveLength(0);
  });

  it("reports a fatal network error to the store", async () => {
    const { store } = await renderPlayer();
    emitError(fatalNetworkError);
    expect(selectPlayer(store.getState()).playbackError).toBe(
      "The converted stream failed (manifestLoadError).",
    );
  });

  it("ignores an error that hls.js recovers from", async () => {
    const { store } = await renderPlayer();
    emitError({ fatal: false, type: "networkError", details: "fragLoadError" });
    expect(selectPlayer(store.getState()).playbackError).toBeNull();
  });

  describe("after a fatal media error", () => {
    it("asks hls.js to recover", async () => {
      await renderPlayer();
      emitError(fatalMediaError);
      expect(readInstance().recoverMediaError).toHaveBeenCalled();
    });

    it("reports nothing to the store", async () => {
      const { store } = await renderPlayer();
      emitError(fatalMediaError);
      expect(selectPlayer(store.getState()).playbackError).toBeNull();
    });

    it("reports a second fatal media error to the store", async () => {
      const { store } = await renderPlayer();
      emitError(fatalMediaError);
      emitError(fatalMediaError);
      expect(selectPlayer(store.getState()).playbackError).toBe(
        "The converted stream failed (bufferAppendError).",
      );
    });
  });

  it("reports that streams cannot play where hls.js is unsupported", async () => {
    hls.recorded.supported = false;
    const { store } = await renderPlayer();
    expect(selectPlayer(store.getState()).playbackError).toBe(
      "This player cannot play converted streams.",
    );
  });

  it("does not load hls.js for direct playback", async () => {
    await renderPlayer({ kind: "direct", url: "/sample.mp4" });
    expect(hls.recorded.imports).toBe(0);
  });
});
