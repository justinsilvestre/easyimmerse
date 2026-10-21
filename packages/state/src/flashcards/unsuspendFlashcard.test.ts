import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { sendUnsuspend, unsuspendSettled } from "./unsuspendFlashcard.ts";

const request = {
  kind: "liftReviewHold",
  projectId: "p1",
  flashcardId: "h",
} as const;

const settled = (ok: boolean, id = "flashcard/h/unsuspend/1") =>
  actions.requestSettled(
    id,
    request,
    ok
      ? { ok: true, data: undefined }
      : { ok: false, error: { status: 500, message: "Server error" } },
  );

describe("sendUnsuspend", () => {
  it("lifts the flashcard's hold under an id of its own", () => {
    expect(sendUnsuspend("p1", "h")).toEqual({
      type: "sendRequestWithFreeId",
      prefix: "flashcard/h/unsuspend",
      request,
    });
  });
});

describe("unsuspendSettled", () => {
  it("tells of a failed unsuspension", () => {
    expect(unsuspendSettled(settled(false))).toHaveLength(1);
  });

  it("says nothing when the unsuspension lands", () => {
    expect(unsuspendSettled(settled(true))).toEqual([]);
  });

  it("leaves the review's own lifts alone", () => {
    expect(unsuspendSettled(settled(false, "review/p1/hold/1"))).toEqual([]);
  });
});
