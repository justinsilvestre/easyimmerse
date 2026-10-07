import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlayerControls } from "./PlayerControls.tsx";
import type { PlayerControlsState } from "./PlayerControlsState.ts";

afterEach(cleanup);

const playback: PlayerControlsState = {
  isPlaying: false,
  currentMs: 30_000,
  durationMs: 120_000,
  buffered: [{ startSeconds: 0, endSeconds: 60 }],
  volume: 1,
  speed: 1,
};

const ignore = () => undefined;

function renderControls(
  overrides: Partial<Parameters<typeof PlayerControls>[0]> = {},
) {
  render(
    <PlayerControls
      playback={playback}
      tracks={{
        subtitles: [],
        targetSubtitlesId: null,
        translationSubtitlesId: null,
      }}
      panels={{ cues: true, waveform: false, distractionFree: false }}
      callbacks={{
        onTogglePlay: ignore,
        onSeek: ignore,
        onSkip: ignore,
        onVolumeChange: ignore,
        onSpeedChange: ignore,
        onToggleSubtitleDisplay: ignore,
        onToggleCuePanel: ignore,
        onToggleWaveform: ignore,
        onToggleDistractionFree: ignore,
      }}
      {...overrides}
    />,
  );
}

describe("PlayerControls", () => {
  it("draws each loaded stretch behind the seek bar", () => {
    renderControls();
    const stretch = screen
      .getByTestId("buffered-track")
      .querySelector<HTMLElement>("[data-buffered]");
    expect(stretch?.style.width).toBe("50%");
  });

  it("names the distraction-free toggle for entering the mode", () => {
    renderControls();
    expect(
      screen.getByRole("button", { name: "Enter distraction-free mode" }),
    ).toBeDefined();
  });

  it("names the distraction-free toggle for leaving the mode", () => {
    renderControls({
      panels: { cues: false, waveform: false, distractionFree: true },
    });
    expect(
      screen.getByRole("button", { name: "Leave distraction-free mode (Esc)" }),
    ).toBeDefined();
  });

  it("offers no fullscreen toggle where the browser has none", () => {
    renderControls();
    expect(screen.queryByRole("button", { name: /fullscreen/ })).toBeNull();
  });

  it("names the fullscreen toggle for leaving fullscreen", () => {
    renderControls({
      panels: {
        cues: true,
        waveform: false,
        distractionFree: false,
        isFullscreen: true,
      },
      callbacks: {
        onTogglePlay: ignore,
        onSeek: ignore,
        onSkip: ignore,
        onVolumeChange: ignore,
        onSpeedChange: ignore,
        onToggleSubtitleDisplay: ignore,
        onToggleCuePanel: ignore,
        onToggleWaveform: ignore,
        onToggleDistractionFree: ignore,
        onToggleFullscreen: ignore,
      },
    });
    expect(
      screen.getByRole("button", { name: "Leave fullscreen (F)" }),
    ).toBeDefined();
  });
});
