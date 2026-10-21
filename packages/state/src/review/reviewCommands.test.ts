import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { reviewCommands } from "./reviewCommands.ts";
import { raiseAllowance } from "./reviewRequests.ts";

describe("reviewCommands", () => {
  describe("when the user asks from the project to review more today", () => {
    const effects = () =>
      reviewCommands(actions.projectReviewMoreRequested("p1", 40));

    it("raises today's allowance of reviews by as many as were offered", () => {
      expect(effects()[0]).toEqual(
        raiseAllowance("p1", { newCards: 0, reviews: 40 }),
      );
    });

    it("then opens the review", () => {
      expect(effects()[1]).toEqual({
        type: "dispatch",
        action: actions.navigated({ type: "openReview", projectId: "p1" }),
      });
    });
  });
});
