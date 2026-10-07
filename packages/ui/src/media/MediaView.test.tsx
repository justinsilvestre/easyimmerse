import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { exampleCues, exampleTranslationCues } from "./exampleCues.ts";
import { MediaView } from "./MediaView.tsx";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ignore = () => undefined;

type ViewProps = Parameters<typeof MediaView>[0];

function renderView(overrides: Partial<ViewProps> = {}) {
  renderWithAppStore(
    <MediaView
      media={{ title: "Episode 1", projectName: "Alpha" }}
      stage={<div role="img" aria-label="Picture" />}
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
      playerCallbacks={{
        onTogglePlay: ignore,
        onSeek: ignore,
        onSkip: ignore,
        onVolumeChange: ignore,
        onSpeedChange: ignore,
        onToggleSubtitleDisplay: ignore,
        onToggleCuePanel: ignore,
        onToggleWaveform: ignore,
        onToggleMute: ignore,
      }}
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
});
