import { resetBackend } from "@easyimmerse/backend";
import type { AppStore, WordHover } from "@easyimmerse/state";
import { actions, selectLookup } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { SubtitlesOverlay } from "./SubtitlesOverlay.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

const translationCues: Cue[] = [
  {
    index: 1,
    start_ms: 1700,
    end_ms: 3000,
    text: "Der Hund will fressen.",
  },
];

function renderOverlay(
  onWordActivated: (hover: WordHover) => void = () => undefined,
) {
  return renderWithAppStore(
    <SubtitlesOverlay
      targetCues={fixtureTrack.cues}
      translationCues={translationCues}
      onWordActivated={onWordActivated}
    />,
  );
}

function moveTo(store: AppStore, ms: number) {
  act(() => {
    store.dispatch(actions.playerTimeChanged(ms));
  });
}

const findOverlay = () =>
  screen.getByRole("region", { name: "Overlaid subtitles" });

describe("SubtitlesOverlay", () => {
  it("shows nothing before the first cue", () => {
    renderOverlay();
    expect(
      screen.queryByRole("region", { name: "Overlaid subtitles" }),
    ).toBeNull();
  });

  it("shows the target cue at the current time as words", () => {
    const { store } = renderOverlay();
    moveTo(store, 600);
    expect(screen.queryByRole("button", { name: "sleeping" })).not.toBeNull();
  });

  it("keeps the last cue visible between cues", () => {
    const { store } = renderOverlay();
    moveTo(store, 1600);
    expect(screen.queryByRole("button", { name: "sleeping" })).not.toBeNull();
  });

  it("removes markup from the cue text", () => {
    const { store } = renderOverlay();
    moveTo(store, 3500);
    expect(findOverlay().textContent).toBe("Everything is quiet.");
  });

  it("shows the translation below the target", () => {
    const { store } = renderOverlay();
    moveTo(store, 2000);
    expect(findOverlay().lastElementChild?.textContent).toBe(
      "Der Hund will fressen.",
    );
  });

  it("shows the translation on top when the overlay shows the translation", () => {
    const { store } = renderOverlay();
    moveTo(store, 2000);
    act(() => {
      store.dispatch(actions.subtitleOverlayToggled());
    });
    expect(findOverlay().firstElementChild?.textContent).toBe(
      "Der Hund will fressen.",
    );
  });

  it("looks up a hovered word with its cue as the context and clip", () => {
    const { store } = renderOverlay();
    moveTo(store, 2000);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "dog" }));
    expect(selectLookup(store.getState())).toMatchObject({
      term: "dog",
      context: "The dog wants to eat.\nIt is hungry.",
      clip: { start_ms: 1750, end_ms: 3000 },
    });
  });

  it("reports an activated word with its cue as the context and clip", () => {
    const activated: WordHover[] = [];
    const { store } = renderOverlay((hover) => activated.push(hover));
    moveTo(store, 3500);
    fireEvent.click(screen.getByRole("button", { name: "Everything" }));
    expect(activated).toEqual([
      {
        word: "Everything",
        context: "Everything is quiet.",
        clip: { start_ms: 3250, end_ms: 4000 },
      },
    ]);
  });
});
