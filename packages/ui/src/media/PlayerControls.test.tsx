import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type PlayerCallbacks, PlayerControls } from "./PlayerControls.tsx";
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

function callbacks(): PlayerCallbacks {
  return {
    onTogglePlay: ignore,
    onSeek: ignore,
    onSkip: ignore,
    onVolumeChange: ignore,
    onSpeedChange: vi.fn(),
    onToggleSubtitleDisplay: ignore,
    onToggleSubtitles: vi.fn(),
    onOpenSubtitleAppearance: vi.fn(),
    onToggleCuePanel: ignore,
    onToggleWaveform: ignore,
    onToggleMute: ignore,
    onToggleFullscreen: ignore,
  };
}

function renderControls(
  overrides: Partial<Parameters<typeof PlayerControls>[0]> = {},
) {
  const props = {
    playback,
    tracks: {
      subtitles: [],
      targetSubtitlesId: null,
      translationSubtitlesId: null,
    },
    panels: { cues: true, waveform: false },
    callbacks: callbacks(),
    ...overrides,
  };
  render(<PlayerControls {...props} />);
  return props.callbacks;
}

const openOptions = () =>
  fireEvent.click(screen.getByRole("button", { name: "Playback options" }));

describe("PlayerControls", () => {
  it("draws each loaded stretch behind the seek bar", () => {
    renderControls();
    const stretch = screen
      .getByTestId("buffered-track")
      .querySelector<HTMLElement>("[data-buffered]");
    expect(stretch?.style.width).toBe("50%");
  });

  it("keeps its buttons on one row", () => {
    renderControls();
    expect(
      screen
        .getByRole("button", { name: "Play (Space)" })
        .parentElement?.classList.contains("flex-nowrap"),
    ).toBe(true);
  });

  it("leaves the panel toggles to the app footer", () => {
    renderControls();
    expect(screen.queryByRole("button", { name: "Waveform" })).toBeNull();
  });

  it("offers no fullscreen toggle", () => {
    renderControls();
    expect(screen.queryByRole("button", { name: /fullscreen/ })).toBeNull();
  });

  it("shows the playback speed on its menu button", () => {
    renderControls({ playback: { ...playback, speed: 1.5 } });
    expect(
      screen.getByRole("button", { name: "Playback speed: 1.5×" }).textContent,
    ).toBe("1.5×");
  });
});

describe("PlayerControls mute button", () => {
  it("offers to mute while the sound is on", () => {
    renderControls();
    expect(screen.getByRole("button", { name: "Mute (M)" })).toBeTruthy();
  });

  it("offers to unmute while muted", () => {
    renderControls({ playback: { ...playback, isMuted: true } });
    expect(screen.getByRole("button", { name: "Unmute (M)" })).toBeTruthy();
  });
});

describe("PlayerControls playback options", () => {
  it("offers no playback speeds", () => {
    renderControls();
    openOptions();
    expect(screen.queryByRole("menuitemradio")).toBeNull();
  });

  it("checks Show subtitles while the subtitles show", () => {
    renderControls();
    openOptions();
    expect(
      screen
        .getByRole("menuitemcheckbox", { name: "Show subtitles" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("unchecks Show subtitles while the subtitles are hidden", () => {
    renderControls({
      panels: { cues: true, waveform: false, areSubtitlesHidden: true },
    });
    openOptions();
    expect(
      screen
        .getByRole("menuitemcheckbox", { name: "Show subtitles" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("hides or shows the subtitles from Show subtitles", () => {
    const { onToggleSubtitles } = renderControls();
    openOptions();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Show subtitles" }),
    );
    expect(onToggleSubtitles).toHaveBeenCalledOnce();
  });

  it("opens the subtitle appearance dialog from Subtitle appearance…", () => {
    const { onOpenSubtitleAppearance } = renderControls();
    openOptions();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Subtitle appearance…" }),
    );
    expect(onOpenSubtitleAppearance).toHaveBeenCalledOnce();
  });
});
