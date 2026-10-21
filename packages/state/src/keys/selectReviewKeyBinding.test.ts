import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  answerLanded,
  exampleQueueCard,
  openReview,
  queueArrived,
  rated,
} from "../review/reviewTestSupport.ts";
import { exampleKeyPress } from "./exampleKeyPress.ts";
import type { KeyPress } from "./keyBinding.ts";
import { bindAction, bindCommand } from "./keyBinding.ts";
import { selectReviewKeyBinding } from "./selectReviewKeyBinding.ts";

const arrived = queueArrived(exampleQueueCard("a"), exampleQueueCard("b"));
const onFront = [openReview, arrived];
const onBack = [...onFront, actions.reviewAnswerShown(0)];
const afterRating = [...onFront, ...rated("good"), answerLanded("a", 7)];

const bindingOf = (given: AppAction[], press: KeyPress) =>
  selectReviewKeyBinding(stateAfter(...given), press);

describe("selectReviewKeyBinding", () => {
  it("shows the answer on Space", () => {
    expect(bindingOf(onFront, exampleKeyPress(" "))).toEqual(
      bindCommand({ type: "showAnswer" }),
    );
  });

  it("shows the answer on Enter", () => {
    expect(bindingOf(onFront, exampleKeyPress("Enter"))).toEqual(
      bindCommand({ type: "showAnswer" }),
    );
  });

  it("rates nothing on a number key before the answer is shown", () => {
    expect(bindingOf(onFront, exampleKeyPress("1"))).toBeNull();
  });

  it("rates the card Remembered on Space once the answer is shown", () => {
    expect(bindingOf(onBack, exampleKeyPress(" "))).toEqual(
      bindCommand({ type: "rate", rating: "good" }),
    );
  });

  it("rates the card Forgot on 1", () => {
    expect(bindingOf(onBack, exampleKeyPress("1"))).toEqual(
      bindCommand({ type: "rate", rating: "again" }),
    );
  });

  it("rates the card Remembered on 2", () => {
    expect(bindingOf(onBack, exampleKeyPress("2"))).toEqual(
      bindCommand({ type: "rate", rating: "good" }),
    );
  });

  it("leaves 3 alone", () => {
    expect(bindingOf(onBack, exampleKeyPress("3"))).toBeNull();
  });

  it("replays the audio on R", () => {
    expect(bindingOf(onFront, exampleKeyPress("r"))).toEqual(
      bindAction(actions.reviewAudioReplayed()),
    );
  });

  it("undoes the latest rating on Z", () => {
    expect(bindingOf(afterRating, exampleKeyPress("z"))).toEqual(
      bindAction(actions.reviewUndoRequested()),
    );
  });

  it("undoes the latest rating on Ctrl+Z or Cmd+Z", () => {
    const press = exampleKeyPress("z", { hasCommandKey: true });
    expect(bindingOf(afterRating, press)).toEqual(
      bindAction(actions.reviewUndoRequested()),
    );
  });

  it("leaves Z to the browser before a rating", () => {
    expect(bindingOf(onFront, exampleKeyPress("z"))).toBeNull();
  });

  it("goes back to the project on Escape", () => {
    expect(bindingOf(onFront, exampleKeyPress("Escape"))).toEqual(
      bindAction(actions.navigated({ type: "openProject", projectId: "p1" })),
    );
  });

  it("leaves Space to a focused button", () => {
    const press = exampleKeyPress(" ", { focus: "control" });
    expect(bindingOf(onBack, press)).toBeNull();
  });

  it("leaves keys to a text field", () => {
    const press = exampleKeyPress("1", { focus: "formField" });
    expect(bindingOf(onBack, press)).toBeNull();
  });

  it("leaves keys to an open menu", () => {
    const press = exampleKeyPress("Escape", { focus: "menu" });
    expect(bindingOf(onBack, press)).toBeNull();
  });

  it("leaves every key alone under a modal dialog", () => {
    const press = exampleKeyPress("Escape", { isDialogOpen: true });
    expect(bindingOf(onBack, press)).toBeNull();
  });

  it("leaves every key alone away from the review", () => {
    expect(bindingOf([], exampleKeyPress(" "))).toBeNull();
  });
});
