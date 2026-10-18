import type { Cue } from "@easyimmerse/types";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CuePanel } from "./CuePanel.tsx";
import type { CueTextCursor } from "./cueCursor.ts";
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

function panel(
  activeCueIndex: number | null,
  {
    onSeek = vi.fn(),
    onWordClick = vi.fn(),
    onOpenFlashcardForCue = vi.fn(),
    cursor,
  }: {
    onSeek?: (ms: number) => void;
    onWordClick?: () => void;
    onOpenFlashcardForCue?: (cueIndex: number) => void;
    cursor?: CueTextCursor;
  } = {},
) {
  return (
    <CuePanel
      cues={exampleCues}
      translationCues={[]}
      activeCueIndex={activeCueIndex}
      cursor={cursor}
      flashcardCueIndexes={[flashcardCue.index]}
      flashcardWordRanges={
        new Map([[flashcardCue.index, [{ from: 5, to: 8 }]]])
      }
      onSeek={onSeek}
      onOpenFlashcardForCue={onOpenFlashcardForCue}
      wordGestures={{
        onWordClick,
        onWordDoubleClick: vi.fn(),
        onWordHold: vi.fn(),
      }}
      onAddSubtitlesFile={vi.fn()}
      onGenerateSubtitles={vi.fn()}
    />
  );
}

/** The first word button inside a card, past its timestamp. */
function firstWordOf(card: HTMLElement): HTMLElement {
  return card.querySelector("[data-clickable-word]") as HTMLElement;
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

/** The cue at 0:08, which the panel marks as having a flashcard. */
const flashcardCue = exampleCues.find((cue) => cue.index === 4) as Cue;

/** The card of the cue that starts at the given time, found through its timestamp button. */
const cardStartingAt = (timestamp: string) =>
  screen
    .getByRole("button", { name: `Play from ${timestamp}` })
    .closest("li") as HTMLElement;

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
  it("seeks to the start of a cue when its card is clicked", () => {
    const onSeek = vi.fn();
    render(panel(2, { onSeek }));
    fireEvent.click(cardStartingAt("0:08"));
    expect(onSeek).toHaveBeenCalledWith(8600);
  });

  it("seeks once when a cue's time is clicked", () => {
    const onSeek = vi.fn();
    render(panel(2, { onSeek }));
    fireEvent.click(screen.getByRole("button", { name: "Play from 0:08" }));
    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  it("leaves the position alone when a word of a card is clicked", () => {
    const onSeek = vi.fn();
    render(panel(2, { onSeek }));
    fireEvent.click(firstWordOf(cardStartingAt("0:08")));
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("looks up a word of a card when it is clicked", () => {
    const onWordClick = vi.fn();
    render(panel(2, { onWordClick }));
    fireEvent.click(firstWordOf(cardStartingAt("0:08")));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onWordClick).toHaveBeenCalled();
  });

  it("follows playback again after the user clicks a card", () => {
    const { rerender } = render(panel(2));
    settle();
    scrollActiveCueOutOfView();
    fireEvent.click(cardStartingAt("0:08"));
    vi.restoreAllMocks();
    scrollIntoView.mockClear();
    rerender(panel(4));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("opens the flashcard of a cue from its card", () => {
    const onOpenFlashcardForCue = vi.fn();
    render(panel(2, { onOpenFlashcardForCue }));
    fireEvent.click(screen.getByRole("button", { name: "Open the flashcard" }));
    expect(onOpenFlashcardForCue).toHaveBeenCalledWith(flashcardCue.index);
  });

  it("leaves the position alone when a flashcard is opened", () => {
    const onSeek = vi.fn();
    render(panel(2, { onSeek }));
    fireEvent.click(screen.getByRole("button", { name: "Open the flashcard" }));
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("marks the word a flashcard was made from in its cue's card", () => {
    render(panel(2));
    expect(
      cardStartingAt("0:08").querySelector("[data-flashcard-word]")
        ?.textContent,
    ).toBe("gib");
  });

  it("marks no word in the cards of other cues", () => {
    render(panel(2));
    expect(
      cardStartingAt("0:05").querySelector("[data-flashcard-word]"),
    ).toBeNull();
  });

  it("shows the words of a cue in a large size", () => {
    render(panel(2));
    expect(
      screen
        .getByRole("button", { name: "Hund" })
        .closest("p")
        ?.classList.contains("text-lg"),
    ).toBe(true);
  });

  it("highlights the lookup cursor in the card of its cue", () => {
    render(
      panel(null, {
        cursor: { cueIndex: 3, start: 4, input: "keyboard", matchedLength: 4 },
      }),
    );
    expect(
      screen
        .getByRole("button", { name: "Hund" })
        .classList.contains("bg-accent-soft"),
    ).toBe(true);
  });

  it("seeks to the previous cue on Up from a focused word", () => {
    const onSeek = vi.fn();
    render(panel(null, { onSeek }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Hund" }), {
      key: "ArrowUp",
    });
    expect(onSeek).toHaveBeenCalledWith(2800);
  });
});
