import type { EditorAction } from "@easyimmerse/state";
import type { AudioClip } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { MediaFields, type MediaWaveform } from "./FlashcardEditorFields.tsx";
import { fieldsOfPreset } from "./flashcardPresets.ts";

afterEach(cleanup);

/** Renders the example flashcard's clip, from 1.75 to 3 seconds, recording what it dispatches to the editor and the clips it plays. */
function renderClip({
  waveform = null,
  isReadOnly = false,
  mediaDurationMs = 0,
}: {
  waveform?: MediaWaveform | null;
  isReadOnly?: boolean;
  mediaDurationMs?: number;
} = {}) {
  const edits: EditorAction[] = [];
  const playedClips: AudioClip[] = [];
  render(
    <MediaFields
      state={{
        content: exampleFlashcard,
        includedFields: fieldsOfPreset("intermediate"),
      }}
      waveform={waveform}
      screenshotUrl={null}
      mediaDurationMs={mediaDurationMs}
      dispatch={(action) => edits.push(action)}
      onPlayClip={(clip) => playedClips.push(clip)}
      isReadOnly={isReadOnly}
    />,
  );
  const press = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));
  return { edits, playedClips, press };
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

  it("keeps the clip's end within the media", () => {
    const { edits, press } = renderClip({ mediaDurationMs: 3050 });
    press("Clip end later");
    expect(edits).toEqual([
      { type: "clipChanged", clip: { start_ms: 1750, end_ms: 3050 } },
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

  it("plays the clip", () => {
    const { playedClips, press } = renderClip();
    press("Play the clip");
    expect(playedClips).toEqual([{ start_ms: 1750, end_ms: 3000 }]);
  });

  it("is offered beside the waveform", () => {
    renderClip({ waveform: { peaks: [0.1, 0.5, 0.9], durationMs: 24_000 } });
    expect(
      screen.queryByRole("button", { name: "Play the clip" }),
    ).not.toBeNull();
  });
});
