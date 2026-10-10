import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PanelToggles } from "./PanelToggles.tsx";
import type { PlayerPanelsState } from "./PlayerControls.tsx";

afterEach(cleanup);

const ignore = () => undefined;

function renderToggles({
  panels = { cues: true, waveform: false },
  onToggleFullscreen,
}: {
  panels?: PlayerPanelsState;
  onToggleFullscreen?: () => void;
} = {}) {
  const cuePanelToggles: string[] = [];
  const callbacks = {
    onToggleCuePanel: () => cuePanelToggles.push("toggled"),
    onToggleWaveform: ignore,
    onToggleFullscreen,
  };
  render(<PanelToggles panels={panels} callbacks={callbacks} />);
  return cuePanelToggles;
}

describe("PanelToggles", () => {
  it("names the waveform toggle for showing the waveform", () => {
    renderToggles();
    expect(
      screen.getByRole("button", { name: "Waveform" }).getAttribute("title"),
    ).toBe("Show the waveform");
  });

  it("offers no distraction-free toggle", () => {
    renderToggles();
    expect(
      screen.queryByRole("button", { name: /distraction-free/ }),
    ).toBeNull();
  });

  it("offers no fullscreen toggle where the browser has none", () => {
    renderToggles();
    expect(screen.queryByRole("button", { name: /fullscreen/ })).toBeNull();
  });

  it("names the fullscreen toggle for leaving fullscreen", () => {
    renderToggles({
      panels: { cues: true, waveform: false, isFullscreen: true },
      onToggleFullscreen: ignore,
    });
    expect(
      screen.getByRole("button", { name: "Leave fullscreen (F)" }),
    ).toBeDefined();
  });

  it("leaves the subtitles panel alone while the flashcard editor holds it", () => {
    const cuePanelToggles = renderToggles({
      panels: { cues: true, waveform: false, isCuePanelTakenByEditor: true },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subtitles panel" }));
    expect(cuePanelToggles).toEqual([]);
  });
});
