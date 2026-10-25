import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { sendSuspend, suspendSettled } from "./suspendFlashcard.ts";

const request = {
  kind: "holdReviewCard",
  projectId: "p1",
  flashcardId: "h",
  hold: "suspended",
} as const;

const settled = (ok: boolean, id = "flashcard/h/suspend/1") =>
  actions.requestSettled(
    id,
    request,
    ok
      ? { ok: true, data: undefined }
      : { ok: false, error: { status: 500, message: "Server error" } },
  );

describe("sendSuspend", () => {
  it("holds the flashcard as suspended under an id of its own", () => {
    expect(sendSuspend("p1", "h")).toEqual({
      type: "sendRequestWithFreeId",
      prefix: "flashcard/h/suspend",
      request,
    });
  });
});

describe("suspendSettled", () => {
  it("tells of a failed suspension", () => {
    expect(suspendSettled(settled(false))).toHaveLength(1);
  });

  it("says nothing when the suspension lands", () => {
    expect(suspendSettled(settled(true))).toEqual([]);
  });

  it("leaves the review's own holds alone", () => {
    expect(suspendSettled(settled(false, "review/p1/hold/1"))).toEqual([]);
  });
});
