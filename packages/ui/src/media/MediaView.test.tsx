import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doubleClickMs } from "../components/gestureTiming.ts";
import { stagePictureAttribute } from "../player/stagePicture.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { exampleCues, exampleTranslationCues } from "./exampleCues.ts";
import { MediaView } from "./MediaView.tsx";
import type { PlayerCallbacks } from "./PlayerControls.tsx";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ignore = () => undefined;

type ViewProps = Parameters<typeof MediaView>[0];

function playerCallbacks(): PlayerCallbacks {
  return {
    onTogglePlay: vi.fn(),
    onSeek: ignore,
    onSkip: ignore,
    onVolumeChange: ignore,
    onSpeedChange: ignore,
    onToggleSubtitleDisplay: ignore,
    onToggleSubtitles: ignore,
    onToggleCuePanel: ignore,
    onToggleWaveform: ignore,
    onToggleMute: ignore,
    onToggleFullscreen: vi.fn(),
  };
}

function renderView(overrides: Partial<ViewProps> = {}) {
  renderWithAppStore(
    <MediaView
      media={{ title: "Episode 1", projectName: "Alpha" }}
      stage={
        <div
          role="img"
          aria-label="Picture"
          {...{ [stagePictureAttribute]: "" }}
        />
      }
      playback={{
        isPlaying: true,
        currentMs: 6_200,
        durationMs: 24_000,
        volume: 1,
        speed: 1,
      }}
      tracks={{
        subtitles: [],
        targetSubtitlesId: null,
        translationSubtitlesId: null,
      }}
      cues={exampleCues}
      translationCues={exampleTranslationCues}
      waveform={null}
      panels={{ cues: false, waveform: false }}
      subtitleDisplay="both"
      playerCallbacks={playerCallbacks()}
      onBack={ignore}
      wordGestures={{ onWordClick: ignore, onWordDoubleClick: ignore }}
      onLookup={ignore}
      onAddFlashcard={ignore}
      {...overrides}
    />,
  );
}

const letPointerRest = () => act(() => vi.advanceTimersByTime(3000));

const areControlsFolded = () =>
  screen.getByRole("button", { name: /\(Space\)$/ }).closest(".opacity-0") !==
  null;

const picture = () => screen.getByRole("img", { name: "Picture" });

const subtitleWord = () => screen.getByRole("button", { name: "Hund" });

describe("MediaView", () => {
  it("shows the controls at first", () => {
    renderView();
    expect(areControlsFolded()).toBe(false);
  });

  it("folds the controls away once the pointer rests while playback runs", () => {
    renderView();
    letPointerRest();
    expect(areControlsFolded()).toBe(true);
  });

  it("brings the controls back when the pointer moves over the picture", () => {
    renderView();
    letPointerRest();
    fireEvent.pointerMove(picture());
    expect(areControlsFolded()).toBe(false);
  });

  it("keeps the controls folded while the pointer moves over the subtitles", () => {
    renderView();
    letPointerRest();
    fireEvent.pointerMove(subtitleWord());
    expect(areControlsFolded()).toBe(true);
  });

  it("hides the pointer over the picture while the controls are folded", () => {
    renderView();
    letPointerRest();
    expect(picture().closest(".cursor-none")).not.toBeNull();
  });

  it("keeps the controls shown while playback is paused", () => {
    renderView({
      playback: {
        isPlaying: false,
        currentMs: 6_200,
        durationMs: 24_000,
        volume: 1,
        speed: 1,
      },
    });
    letPointerRest();
    expect(areControlsFolded()).toBe(false);
  });

  it("folds the controls away while the open pop-up keeps playback paused", () => {
    renderView({
      playback: {
        isPlaying: false,
        currentMs: 6_200,
        durationMs: 24_000,
        volume: 1,
        speed: 1,
      },
      lookup: <div role="dialog" aria-label="Dictionary" />,
    });
    letPointerRest();
    expect(areControlsFolded()).toBe(true);
  });

  it("keeps a subtitle over the video until the next one starts", () => {
    renderView({
      playback: {
        isPlaying: true,
        currentMs: 8_400,
        durationMs: 24_000,
        volume: 1,
        speed: 1,
      },
    });
    expect(subtitleWord()).toBeDefined();
  });

  it("keeps the dictionary pop-up out of the dark stage", () => {
    renderView({ lookup: <div role="dialog" aria-label="Dictionary" /> });
    expect(
      screen.getByRole("dialog").closest('[data-theme="dark"]'),
    ).toBeNull();
  });

  it("hides the subtitles over the video while they are hidden", () => {
    renderView({
      panels: { cues: false, waveform: false, areSubtitlesHidden: true },
    });
    expect(screen.queryByRole("button", { name: "Hund" })).toBeNull();
  });

  it("shows the panel toggles in the app footer", () => {
    renderView();
    expect(
      screen.getByRole("button", { name: "Waveform" }).closest("footer"),
    ).not.toBeNull();
  });
});

describe("MediaView stage clicks", () => {
  function renderWithSpies(callbacks: Partial<PlayerCallbacks> = {}) {
    const spies = { ...playerCallbacks(), ...callbacks };
    renderView({ playerCallbacks: spies });
    return spies;
  }

  it("plays or pauses at once when the picture is clicked", () => {
    const { onTogglePlay } = renderWithSpies();
    fireEvent.click(picture());
    expect(onTogglePlay).toHaveBeenCalledOnce();
  });

  it("fills the screen when the picture is double-clicked", () => {
    const { onToggleFullscreen } = renderWithSpies();
    fireEvent.click(picture());
    fireEvent.click(picture());
    expect(onToggleFullscreen).toHaveBeenCalledOnce();
  });

  it("plays or pauses back when the picture is double-clicked", () => {
    const { onTogglePlay } = renderWithSpies();
    fireEvent.click(picture());
    fireEvent.click(picture());
    expect(onTogglePlay).toHaveBeenCalledTimes(2);
  });

  it("takes two clicks further apart than a double-click as two single clicks", () => {
    const { onToggleFullscreen } = renderWithSpies();
    fireEvent.click(picture());
    act(() => vi.advanceTimersByTime(doubleClickMs));
    fireEvent.click(picture());
    expect(onToggleFullscreen).not.toHaveBeenCalled();
  });

  it("plays or pauses at once where the screen cannot be filled", () => {
    const { onTogglePlay } = renderWithSpies({
      onToggleFullscreen: undefined,
    });
    fireEvent.click(picture());
    expect(onTogglePlay).toHaveBeenCalledOnce();
  });

  it("leaves fullscreen alone when the subtitles are double-clicked", () => {
    const { onToggleFullscreen } = renderWithSpies();
    fireEvent.click(subtitleWord());
    fireEvent.click(subtitleWord());
    expect(onToggleFullscreen).not.toHaveBeenCalled();
  });

  it("leaves fullscreen alone when the header is double-clicked", () => {
    const { onToggleFullscreen } = renderWithSpies();
    fireEvent.click(screen.getByRole("heading", { name: "Episode 1" }));
    fireEvent.click(screen.getByRole("heading", { name: "Episode 1" }));
    expect(onToggleFullscreen).not.toHaveBeenCalled();
  });
});
