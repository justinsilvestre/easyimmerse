import type { Cue } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doubleClickMs } from "../components/gestureTiming.ts";
import { stagePictureAttribute } from "../player/stagePicture.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { exampleCues, exampleTranslationCues } from "./exampleCues.ts";
import { MediaView } from "./MediaView.tsx";
import type { PlayerCallbacks } from "./PlayerControls.tsx";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";

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
    onOpenSubtitleAppearance: ignore,
    onToggleCuePanel: ignore,
    onToggleWaveform: ignore,
    onToggleMute: ignore,
    onToggleFullscreen: vi.fn(),
  };
}

/** The cue of `exampleCues` spoken at 6.2 seconds, where the view's playback stands. */
const dogCue = exampleCues[2] ?? null;

function renderView(overrides: Partial<ViewProps> = {}) {
  renderWithAppStore(
    <MediaView
      media={{ title: "Episode 1", projectName: "Alpha", source: null }}
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
      shownCue={dogCue}
      waveform={null}
      panels={{ cues: false, waveform: false }}
      subtitleDisplay="both"
      subtitleAppearance={defaultSubtitleAppearance}
      onSubtitleAppearanceChange={ignore}
      onCloseSubtitleAppearance={ignore}
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
  describe("for a file imported through a plugin", () => {
    const media = {
      title: "Episode 1",
      projectName: "Alpha",
      source: { title: "Video site", isAvailable: true },
    };

    it("opens the plugin's media interface from the chip named after it", () => {
      const onOpenSource = vi.fn();
      renderView({ media, onOpenSource });
      fireEvent.click(screen.getByRole("button", { name: "Video site" }));
      expect(onOpenSource).toHaveBeenCalledOnce();
    });

    it("opens nothing from the chip while the plugin is not installed", () => {
      const onOpenSource = vi.fn();
      const source = { title: "downloader", isAvailable: false };
      renderView({ media: { ...media, source }, onOpenSource });
      fireEvent.click(screen.getByRole("button", { name: "downloader" }));
      expect(onOpenSource).not.toHaveBeenCalled();
    });
  });

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

  it("keeps the controls folded while the pointer moves over the empty part of the subtitle box", () => {
    renderView();
    letPointerRest();
    fireEvent.pointerMove(screen.getByTestId("subtitle-box"));
    expect(areControlsFolded()).toBe(true);
  });

  it("keeps the pointer shown over the subtitle box while the controls are folded", () => {
    renderView();
    letPointerRest();
    expect(
      screen.getByTestId("subtitle-box").classList.contains("cursor-auto"),
    ).toBe(true);
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

  it("keeps the controls out of the subtitle band", () => {
    renderView();
    expect(
      screen
        .getByRole("button", { name: /\(Space\)$/ })
        .closest('[data-testid="subtitle-band"]'),
    ).toBeNull();
  });

  it("keeps the controls on the dark stage", () => {
    renderView();
    expect(
      screen
        .getByRole("button", { name: /\(Space\)$/ })
        .closest('[data-theme="dark"]'),
    ).not.toBeNull();
  });

  it("shows no subtitle over the video while no cue is shown", () => {
    renderView({ shownCue: null });
    expect(screen.queryByRole("button", { name: "Hund" })).toBeNull();
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

  it("lays the header on translucent black, like the controls", () => {
    renderView();
    expect(
      screen
        .getByRole("heading", { name: "Episode 1" })
        .closest("header")
        ?.classList.contains("bg-black/90"),
    ).toBe(true);
  });

  it("shows the panel toggles in the app footer", () => {
    renderView();
    expect(
      screen.getByRole("button", { name: "Waveform" }).closest("footer"),
    ).not.toBeNull();
  });
});

describe("MediaView footer", () => {
  const fullscreenPanels = { cues: false, waveform: false, isFullscreen: true };

  const footer = () =>
    screen.getByRole("button", { name: "Waveform" }).closest("footer");

  it("stays off the stage outside fullscreen", () => {
    renderView();
    expect(footer()?.closest('[data-theme="dark"]')).toBeNull();
  });

  it("stays shown outside fullscreen while the controls fold away", () => {
    renderView();
    letPointerRest();
    expect(footer()?.closest(".opacity-0")).toBeNull();
  });

  it("lies over the foot of the stage in fullscreen", () => {
    renderView({ panels: fullscreenPanels });
    expect(footer()?.closest('[data-theme="dark"]')).not.toBeNull();
  });

  it("folds away with the controls in fullscreen", () => {
    renderView({ panels: fullscreenPanels });
    letPointerRest();
    expect(footer()?.closest(".opacity-0")).not.toBeNull();
  });

  it("shows with the controls in fullscreen", () => {
    renderView({ panels: fullscreenPanels });
    expect(footer()?.closest(".opacity-0")).toBeNull();
  });
});

describe("MediaView subtitle box", () => {
  const subtitleBox = () => screen.getByTestId("subtitle-box");

  const heightWith = (shownCue: Cue | null) => {
    renderView({ shownCue });
    const { height } = subtitleBox().style;
    cleanup();
    return height;
  };

  it("keeps its height from a cue of two lines to a cue of one", () => {
    expect(heightWith(dogCue)).toBe(heightWith(exampleCues[3] ?? null));
  });

  it("keeps less room when only the target language shows", () => {
    renderView({ subtitleDisplay: "target" });
    const targetOnly = subtitleBox().style.height;
    cleanup();
    renderView();
    expect(subtitleBox().style.height).not.toBe(targetOnly);
  });

  it("lies on black under the picture, like the video", () => {
    renderView();
    expect(
      screen.getByTestId("subtitle-band").classList.contains("bg-black"),
    ).toBe(true);
  });

  it("draws no backdrop while the subtitles are hidden", () => {
    renderView({
      panels: { cues: false, waveform: false, areSubtitlesHidden: true },
    });
    expect(
      screen.getByTestId("subtitle-band").classList.contains("bg-black"),
    ).toBe(false);
  });

  it("is left out for a file without subtitles", () => {
    renderView({ cues: [], translationCues: [] });
    expect(screen.queryByTestId("subtitle-box")).toBeNull();
  });

  it("keeps the lookup buttons outside it", () => {
    renderView();
    expect(
      screen
        .getByRole("button", { name: "Look up a word (L)" })
        .closest('[data-testid="subtitle-box"]'),
    ).toBeNull();
  });

  it("keeps the lookup buttons in its band rather than above it", () => {
    renderView();
    expect(
      screen
        .getByRole("button", { name: "Look up a word (L)" })
        .closest(".bottom-full"),
    ).toBeNull();
  });

  it("gives the lookup buttons a row of their own when no subtitles show", () => {
    renderView({ cues: [], translationCues: [] });
    expect(
      screen
        .getByRole("button", { name: "Look up a word (L)" })
        .closest(".absolute"),
    ).toBeNull();
  });

  it("marks the word of the shown cue that a flashcard was made from", () => {
    renderView({ flashcardWordRanges: new Map([[3, [{ from: 4, to: 8 }]]]) });
    expect(
      subtitleBox().querySelector("[data-flashcard-word]")?.textContent,
    ).toBe("Hund");
  });

  it("shows the appearance dialog while it is open", () => {
    renderView({ isSubtitleAppearanceOpen: true });
    expect(
      screen.getByRole("dialog", { name: "Subtitle appearance" }),
    ).toBeDefined();
  });

  it("shows no appearance dialog while it is closed", () => {
    renderView();
    expect(
      screen.queryByRole("dialog", { name: "Subtitle appearance" }),
    ).toBeNull();
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
