import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import { exampleReviewCard } from "./exampleReviewCards.ts";
import type { ReviewButtons } from "./RatingBar.tsx";
import { ReviewSession } from "./ReviewSession.tsx";

afterEach(cleanup);

function renderSession({
  stage = "front",
  buttons = "two",
  canUndo = false,
}: {
  stage?: "front" | "back";
  buttons?: ReviewButtons;
  canUndo?: boolean;
} = {}) {
  const calls: string[] = [];
  const call = (name: string) => () => calls.push(name);
  render(
    <ReviewSession
      card={exampleReviewCard}
      stage={stage}
      buttons={buttons}
      end={null}
      canUndo={canUndo}
      includedFields={["word", "text_context", "audio_context"]}
      frontFields={["word"]}
      languages={exampleLanguages}
      onShowAnswer={call("showAnswer")}
      onRate={(grade) => calls.push(`rate ${grade}`)}
      onReplayAudio={call("replayAudio")}
      onUndo={call("undo")}
      onBack={call("back")}
      onLearnMore={call("learnMore")}
    />,
  );
  return calls;
}

const press = (key: string, options: { ctrlKey?: boolean } = {}) =>
  fireEvent.keyDown(document.body, { key, ...options });

describe("ReviewSession", () => {
  describe("on the front of a card", () => {
    it("shows the answer on Space", () => {
      const calls = renderSession();
      press(" ");
      expect(calls).toEqual(["showAnswer"]);
    });

    it("shows the answer on Enter", () => {
      const calls = renderSession();
      press("Enter");
      expect(calls).toEqual(["showAnswer"]);
    });

    it("rates nothing on a number key", () => {
      const calls = renderSession();
      press("1");
      expect(calls).toEqual([]);
    });
  });

  describe("on the back of a card with two buttons", () => {
    it("rates the card as remembered on Space", () => {
      const calls = renderSession({ stage: "back" });
      press(" ");
      expect(calls).toEqual(["rate good"]);
    });

    it("rates the card as forgotten on 1", () => {
      const calls = renderSession({ stage: "back" });
      press("1");
      expect(calls).toEqual(["rate again"]);
    });

    it("rates the card as remembered on 2", () => {
      const calls = renderSession({ stage: "back" });
      press("2");
      expect(calls).toEqual(["rate good"]);
    });

    it("rates nothing on 3", () => {
      const calls = renderSession({ stage: "back" });
      press("3");
      expect(calls).toEqual([]);
    });
  });

  describe("on the back of a card with four buttons", () => {
    it("rates the card as hard on 2", () => {
      const calls = renderSession({ stage: "back", buttons: "four" });
      press("2");
      expect(calls).toEqual(["rate hard"]);
    });

    it("rates the card as easy on 4", () => {
      const calls = renderSession({ stage: "back", buttons: "four" });
      press("4");
      expect(calls).toEqual(["rate easy"]);
    });
  });

  it("replays the audio on R", () => {
    const calls = renderSession();
    press("r");
    expect(calls).toEqual(["replayAudio"]);
  });

  it("undoes the last rating on Z", () => {
    const calls = renderSession({ canUndo: true });
    press("z");
    expect(calls).toEqual(["undo"]);
  });

  it("undoes the last rating on Ctrl+Z", () => {
    const calls = renderSession({ canUndo: true });
    press("z", { ctrlKey: true });
    expect(calls).toEqual(["undo"]);
  });

  it("undoes nothing before a rating", () => {
    const calls = renderSession();
    press("z");
    expect(calls).toEqual([]);
  });

  it("goes back to the project on Escape", () => {
    const calls = renderSession();
    press("Escape");
    expect(calls).toEqual(["back"]);
  });

  it("leaves Space to a focused button", () => {
    const calls = renderSession({ stage: "back" });
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Play the sentence audio" }),
      { key: " " },
    );
    expect(calls).toEqual([]);
  });

  it("leaves keys to a text field", () => {
    const calls = renderSession({ stage: "back" });
    const field = document.createElement("input");
    document.body.append(field);
    fireEvent.keyDown(field, { key: "1" });
    field.remove();
    expect(calls).toEqual([]);
  });
});
