import { resetBackend } from "@easyimmerse/backend";
import type { PlayerHandle } from "@easyimmerse/state";
import { actions, selectPlayer } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlayerRegistry } from "../playerRegistryContext.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import {
  stubCanvasEncoding,
  stubMediaDuration,
  stubVideoFrameSize,
} from "../testSupport/stubMediaElement.ts";
import { MediaPlayer } from "./MediaPlayer.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderPlayer(kind: "video" | "audio" = "video") {
  const rendered = renderWithAppStore(
    <MediaPlayer
      kind={kind}
      src={`/sample.${kind === "video" ? "mp4" : "mp3"}`}
    />,
  );
  const element = document.querySelector(kind);
  if (!(element instanceof HTMLMediaElement))
    throw new Error(`No ${kind} element was rendered.`);
  return { ...rendered, element };
}

const oneSecondLoop = {
  range: { start_ms: 1000, end_ms: 2000 },
  restartMs: 1010,
};

function readHandle(handle: PlayerHandle | null): PlayerHandle {
  if (handle === null) throw new Error("No player is registered.");
  return handle;
}

function ReadPlayerOnMount({
  seen,
  children,
}: {
  seen: (PlayerHandle | null)[];
  children: ReactNode;
}) {
  const registry = usePlayerRegistry();
  useEffect(() => {
    seen.push(registry.current());
  }, [registry, seen]);
  return children;
}

describe("MediaPlayer", () => {
  it("renders a video element for video", () => {
    const { element } = renderPlayer("video");
    expect(element.getAttribute("src")).toBe("/sample.mp4");
  });

  it("renders artwork for audio", () => {
    renderPlayer("audio");
    expect(screen.queryByRole("img", { name: "Audio artwork" })).not.toBeNull();
  });

  it("requests play when the video is clicked", () => {
    const { element, effects } = renderPlayer("video");
    fireEvent.click(element);
    expect(effects.calls).toContainEqual({ type: "playPlayer" });
  });

  it("is registered by the time an enclosing component's mount effect runs", () => {
    const seen: (PlayerHandle | null)[] = [];
    renderWithAppStore(
      <ReadPlayerOnMount seen={seen}>
        <MediaPlayer kind="video" src="/sample.mp4" />
      </ReadPlayerOnMount>,
    );
    expect(seen[0]).not.toBeNull();
  });

  it("unregisters its handle on unmount", () => {
    const { playerRegistry } = renderPlayer();
    cleanup();
    expect(playerRegistry.current()).toBeNull();
  });

  describe("its registered handle", () => {
    it("seeks the element to the time in seconds", () => {
      const { element, playerRegistry } = renderPlayer();
      readHandle(playerRegistry.current()).seek(2500);
      expect(element.currentTime).toBe(2.5);
    });

    it("plays the element", () => {
      const { element, playerRegistry } = renderPlayer();
      act(() => readHandle(playerRegistry.current()).play());
      expect(element.paused).toBe(false);
    });

    it("pauses the element", () => {
      const { element, playerRegistry } = renderPlayer();
      const handle = readHandle(playerRegistry.current());
      act(() => {
        handle.play();
        handle.pause();
      });
      expect(element.paused).toBe(true);
    });

    it("sets the element's playback rate", () => {
      const { element, playerRegistry } = renderPlayer();
      readHandle(playerRegistry.current()).setPlaybackRate(1.5);
      expect(element.playbackRate).toBe(1.5);
    });

    it("keeps the playback rate for later loads as the element's default rate", () => {
      const { element, playerRegistry } = renderPlayer();
      readHandle(playerRegistry.current()).setPlaybackRate(1.5);
      expect(element.defaultPlaybackRate).toBe(1.5);
    });

    it("sets the element's volume", () => {
      const { element, playerRegistry } = renderPlayer();
      readHandle(playerRegistry.current()).setVolume(0.25);
      expect(element.volume).toBe(0.25);
    });

    it("seeks back to the loop's restart time once the time reaches the loop end", () => {
      const { element, playerRegistry } = renderPlayer();
      readHandle(playerRegistry.current()).setLoop(oneSecondLoop);
      element.currentTime = 2.1;
      fireEvent.timeUpdate(element);
      expect(element.currentTime).toBe(1.01);
    });

    it("seeks to the loop's restart time when the loop is set while past its end", () => {
      const { element, playerRegistry } = renderPlayer();
      element.currentTime = 2.5;
      readHandle(playerRegistry.current()).setLoop(oneSecondLoop);
      expect(element.currentTime).toBe(1.01);
    });

    it("seeks to the loop's restart time when the loop is set while before it", () => {
      const { element, playerRegistry } = renderPlayer();
      element.currentTime = 0.5;
      readHandle(playerRegistry.current()).setLoop(oneSecondLoop);
      expect(element.currentTime).toBe(1.01);
    });

    it("keeps a time inside the loop that lies before its restart time", () => {
      const { element, playerRegistry } = renderPlayer();
      readHandle(playerRegistry.current()).setLoop(oneSecondLoop);
      element.currentTime = 1.005;
      fireEvent.timeUpdate(element);
      expect(element.currentTime).toBe(1.005);
    });

    it("stops repeating once the loop is cleared", () => {
      const { element, playerRegistry } = renderPlayer();
      const handle = readHandle(playerRegistry.current());
      handle.setLoop(oneSecondLoop);
      handle.setLoop(null);
      element.currentTime = 2.1;
      fireEvent.timeUpdate(element);
      expect(element.currentTime).toBe(2.1);
    });

    it("captures the current video frame as a PNG data URL", () => {
      const { element, playerRegistry } = renderPlayer("video");
      stubVideoFrameSize(element as HTMLVideoElement, 320, 180);
      const restoreCanvas = stubCanvasEncoding("data:image/png;base64,AAAA");
      const frame = readHandle(playerRegistry.current()).captureFrame();
      restoreCanvas();
      expect(frame).toBe("data:image/png;base64,AAAA");
    });

    it("captures no frame before the video has one", () => {
      const { playerRegistry } = renderPlayer("video");
      expect(readHandle(playerRegistry.current()).captureFrame()).toBeNull();
    });

    it("captures no frame for audio", () => {
      const { playerRegistry } = renderPlayer("audio");
      expect(readHandle(playerRegistry.current()).captureFrame()).toBeNull();
    });
  });

  describe("reporting to the store", () => {
    it("reports the element's time on timeupdate", () => {
      const { element, store } = renderPlayer();
      element.currentTime = 1.25;
      fireEvent.timeUpdate(element);
      expect(selectPlayer(store.getState()).currentTimeMs).toBe(1250);
    });

    it("reports the duration once the metadata loads", () => {
      const { element, store } = renderPlayer();
      stubMediaDuration(element, 5);
      fireEvent.loadedMetadata(element);
      expect(selectPlayer(store.getState()).durationMs).toBe(5000);
    });

    it("ignores an unknown duration", () => {
      const { element, store } = renderPlayer();
      stubMediaDuration(element, Number.NaN);
      fireEvent.loadedMetadata(element);
      expect(selectPlayer(store.getState()).durationMs).toBeNull();
    });

    it("reports that the element plays", () => {
      const { element, store } = renderPlayer();
      fireEvent.play(element);
      expect(selectPlayer(store.getState()).playing).toBe(true);
    });

    it("reports that the element stopped at the end", () => {
      const { element, store } = renderPlayer();
      fireEvent.play(element);
      fireEvent.ended(element);
      expect(selectPlayer(store.getState()).playing).toBe(false);
    });
  });

  describe("applying the store's settings", () => {
    it("applies the volume to the element", () => {
      const { element, store } = renderPlayer();
      act(() => {
        store.dispatch(actions.volumeChanged(0.4));
      });
      expect(element.volume).toBe(0.4);
    });

    it("applies the playback rate to the element", () => {
      const { element, store } = renderPlayer();
      act(() => {
        store.dispatch(actions.playbackRateChanged(0.75));
      });
      expect(element.playbackRate).toBe(0.75);
    });
  });
});
