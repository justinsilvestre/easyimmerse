import type { Cue } from "@easyimmerse/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleCues } from "./exampleCues.ts";
import { SubtitleOverlay } from "./SubtitleOverlay.tsx";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";

afterEach(cleanup);

const hundCue = exampleCues[2] as Cue;
const nextCue = exampleCues[3] as Cue;

function overlay(props: Partial<ComponentProps<typeof SubtitleOverlay>>) {
  return (
    <SubtitleOverlay
      targetCue={hundCue}
      translationCue={null}
      display="target"
      appearance={defaultSubtitleAppearance}
      wordGestures={{}}
      {...props}
    />
  );
}

describe("SubtitleOverlay", () => {
  it("asks for the next cue on Down from a focused word", () => {
    const steps: string[] = [];
    render(
      overlay({
        onCueStep: (cue, step) => steps.push(`${step} of ${cue.index}`),
      }),
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Hund" }), {
      key: "ArrowDown",
    });
    expect(steps).toEqual(["next of 3"]);
  });

  it("moves focus to the first word of a cue that replaces the focused one", () => {
    const { rerender } = render(overlay({}));
    screen.getByRole("button", { name: "Hund" }).focus();
    rerender(overlay({ targetCue: nextCue }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Dann" }),
    );
  });

  it("leaves focus alone when the cue changes while focus is elsewhere", () => {
    const { rerender } = render(
      <>
        <button type="button">Play</button>
        {overlay({})}
      </>,
    );
    screen.getByRole("button", { name: "Hund" }).focus();
    screen.getByRole("button", { name: "Play" }).focus();
    rerender(
      <>
        <button type="button">Play</button>
        {overlay({ targetCue: nextCue })}
      </>,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Play" }),
    );
  });

  it("highlights the lookup cursor when it lies in the target cue", () => {
    render(
      overlay({
        cursor: { cueIndex: 3, start: 4, input: "keyboard", matchedLength: 4 },
      }),
    );
    expect(
      screen
        .getByRole("button", { name: "Hund" })
        .classList.contains("bg-accent-soft"),
    ).toBe(true);
  });
});
