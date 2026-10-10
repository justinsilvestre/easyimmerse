import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { unsavedWorkFeature } from "./unsavedWork.ts";

const effectsOf = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(...before);
  return unsavedWorkFeature.update(app.unsavedWork, action, app)[1];
};

describe("unsavedWorkFeature", () => {
  it("guards the app's closing when the first unsaved work begins", () => {
    expect(effectsOf(actions.unsavedWorkBegan())).toEqual([
      { type: "guardClose", isActive: true },
    ]);
  });

  it("keeps the guard while more unsaved work begins", () => {
    expect(
      effectsOf(actions.unsavedWorkBegan(), actions.unsavedWorkBegan()),
    ).toEqual([]);
  });

  it("keeps the guard while other unsaved work remains", () => {
    expect(
      effectsOf(
        actions.unsavedWorkEnded(),
        actions.unsavedWorkBegan(),
        actions.unsavedWorkBegan(),
      ),
    ).toEqual([]);
  });

  it("lifts the guard once the last unsaved work ends", () => {
    expect(
      effectsOf(actions.unsavedWorkEnded(), actions.unsavedWorkBegan()),
    ).toEqual([{ type: "guardClose", isActive: false }]);
  });
});
