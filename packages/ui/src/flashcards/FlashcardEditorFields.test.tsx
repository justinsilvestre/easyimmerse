import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import type { EditorAction } from "./editFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { MediaFields, type MediaWaveform } from "./FlashcardEditorFields.tsx";
import { fieldsOfPreset } from "./flashcardPresets.ts";

afterEach(cleanup);

/** Renders the example flashcard's clip, from 1.75 to 3 seconds, recording what it dispatches to the editor and asks of the player. */
function renderClip({
  waveform = null,
  isReadOnly = false,
}: {
  waveform?: MediaWaveform | null;
  isReadOnly?: boolean;
} = {}) {
  const edits: EditorAction[] = [];
  const rendered = renderWithAppStore(
    <MediaFields
      state={{
        content: exampleFlashcard,
        includedFields: fieldsOfPreset("intermediate"),
      }}
      waveform={waveform}
      screenshotUrl={null}
      dispatch={(action) => edits.push(action)}
      isReadOnly={isReadOnly}
    />,
    createFakeBackendClient({}),
  );
  act(() =>
    rendered.store.dispatch(actions.openMediaFileRequested("p1", "m1")),
  );
  const playerCalls = () =>
    rendered.effects.calls.filter((call) => call.type.endsWith("Player"));
  const reportPlayer = (isPlaying: boolean, seconds: number) =>
    act(() => {
      rendered.store.dispatch(actions.playerPlayingChanged(isPlaying));
      rendered.store.dispatch(actions.playerTimeChanged(seconds));
    });
  const press = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));
  return { edits, playerCalls, reportPlayer, press };
}

describe("MediaFields without a waveform", () => {
  it("shows the clip's start", () => {
    renderClip();
    expect(
      screen.getByRole("group", { name: "Clip start" }).textContent,
    ).toContain("0:01.7");
  });

  it("shows the clip's end", () => {
    renderClip();
    expect(
      screen.getByRole("group", { name: "Clip end" }).textContent,
    ).toContain("0:03.0");
  });

  it("shows how long the clip lasts", () => {
    renderClip();
    expect(screen.queryByText("1.3 s")).not.toBeNull();
  });

  it("moves the clip's start a tenth of a second earlier", () => {
    const { edits, press } = renderClip();
    press("Clip start earlier");
    expect(edits).toEqual([
      { type: "clipChanged", clip: { start_ms: 1650, end_ms: 3000 } },
    ]);
  });

  it("moves the clip's end a tenth of a second later", () => {
    const { edits, press } = renderClip();
    press("Clip end later");
    expect(edits).toEqual([
      { type: "clipChanged", clip: { start_ms: 1750, end_ms: 3100 } },
    ]);
  });

  it("makes the clip's buttons inert while read-only", () => {
    renderClip({ isReadOnly: true });
    expect(
      screen
        .getByRole("group", { name: "Sentence audio" })
        .hasAttribute("inert"),
    ).toBe(true);
  });
});

describe("MediaFields' Play button", () => {
  it("reads Play", () => {
    renderClip();
    expect(
      screen.getByRole("button", { name: "Play the clip" }).textContent,
    ).toBe("Play");
  });

  it("seeks to the clip's start and then plays", () => {
    const { playerCalls, press } = renderClip();
    press("Play the clip");
    expect(playerCalls()).toEqual([
      { type: "seekPlayer", seconds: 1.75 },
      { type: "playPlayer" },
    ]);
  });

  it("is offered beside the waveform", () => {
    renderClip({ waveform: { peaks: [0.1, 0.5, 0.9], durationMs: 24_000 } });
    expect(
      screen.queryByRole("button", { name: "Play the clip" }),
    ).not.toBeNull();
  });

  it("pauses the player once playback reaches the clip's end", () => {
    const { playerCalls, press, reportPlayer } = renderClip();
    press("Play the clip");
    reportPlayer(true, 2.5);
    reportPlayer(true, 3.1);
    expect(playerCalls().map((call) => call.type)).toEqual([
      "seekPlayer",
      "playPlayer",
      "pausePlayer",
    ]);
  });

  it("leaves playback alone once the user has moved away from the clip", () => {
    const { playerCalls, press, reportPlayer } = renderClip();
    press("Play the clip");
    reportPlayer(true, 2.5);
    reportPlayer(true, 12);
    expect(playerCalls().map((call) => call.type)).toEqual([
      "seekPlayer",
      "playPlayer",
    ]);
  });
});
