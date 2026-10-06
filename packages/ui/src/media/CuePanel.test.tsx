import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CuePanel } from "./CuePanel.tsx";
import { exampleCues } from "./exampleCues.ts";

const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function panel(activeCueIndex: number | null, onSeek = vi.fn()) {
  return (
    <CuePanel
      cues={exampleCues}
      translationCues={[]}
      activeCueIndex={activeCueIndex}
      flashcardCueIndexes={[]}
      onSeek={onSeek}
      wordGestures={{
        onWordClick: vi.fn(),
        onWordDoubleClick: vi.fn(),
        onWordHoverIntent: vi.fn(),
        onWordHold: vi.fn(),
      }}
      onAddSubtitlesFile={vi.fn()}
      onGenerateSubtitles={vi.fn()}
    />
  );
}

/** Lets the scroll the panel started settle, so that the next scroll counts as the user's. */
function settle() {
  act(() => {
    vi.advanceTimersByTime(1000);
  });
}

/** Scrolls the list as the user would, leaving the active cue above the list's viewport. */
function scrollActiveCueOutOfView() {
  const list = screen.getByRole("list", { name: "Subtitles" });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return this.hasAttribute("aria-current")
        ? new DOMRect(0, -200, 300, 60)
        : new DOMRect(0, 0, 300, 400);
    },
  );
  fireEvent.scroll(list);
}

const backButton = () =>
  screen.queryByRole("button", { name: "Back to current line" });

describe("CuePanel", () => {
  it("scrolls the newly active cue into view while following", () => {
    const { rerender } = render(panel(2));
    settle();
    scrollIntoView.mockClear();
    rerender(panel(3));
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByRole("button", { name: "Play from 0:05" }).closest("li"),
    );
  });

  it("offers no way back while following", () => {
    render(panel(2));
    expect(backButton()).toBeNull();
  });

  it("offers a way back once the user scrolls the active cue out of view", () => {
    render(panel(2));
    settle();
    scrollActiveCueOutOfView();
    expect(backButton()).not.toBeNull();
  });

  it("leaves the list where the user scrolled it when the next cue becomes active", () => {
    const { rerender } = render(panel(2));
    settle();
    scrollActiveCueOutOfView();
    scrollIntoView.mockClear();
    rerender(panel(3));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("ignores scrolls of its own while bringing the active cue into view", () => {
    render(panel(2));
    scrollActiveCueOutOfView();
    expect(backButton()).toBeNull();
  });

  it("scrolls back to the active cue when the user asks to", () => {
    render(panel(2));
    settle();
    scrollActiveCueOutOfView();
    scrollIntoView.mockClear();
    fireEvent.click(backButton() as HTMLElement);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("follows playback again after the user goes back to the active cue", () => {
    const { rerender } = render(panel(2));
    settle();
    scrollActiveCueOutOfView();
    fireEvent.click(backButton() as HTMLElement);
    settle();
    scrollIntoView.mockClear();
    rerender(panel(3));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("follows playback again after the user seeks to a cue", () => {
    const { rerender } = render(panel(2));
    settle();
    scrollActiveCueOutOfView();
    fireEvent.click(screen.getByRole("button", { name: "Play from 0:08" }));
    vi.restoreAllMocks();
    scrollIntoView.mockClear();
    rerender(panel(4));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("offers no way back while no cue is active", () => {
    const { rerender } = render(panel(2));
    settle();
    scrollActiveCueOutOfView();
    rerender(panel(null));
    expect(backButton()).toBeNull();
  });

  it("scrolls without animation when the user prefers reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    render(panel(2));
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      behavior: "auto",
    });
  });
});
