import { describe, expect, it } from "vitest";
import type { AppAction } from "./appAction.ts";
import { actions } from "./appAction.ts";
import { dispatch, dispatchEffectRunners } from "./dispatchEffect.ts";
import type { EffectContext } from "./runEffect.ts";

describe("dispatchEffectRunners", () => {
  it("dispatches the effect's action", () => {
    const dispatched: AppAction[] = [];
    const context = {
      dispatch: (action: AppAction) => dispatched.push(action),
    } as unknown as EffectContext;
    const action = actions.flashcardFormOpened(null);
    dispatchEffectRunners.dispatch(dispatch(action), context);
    expect(dispatched).toEqual([action]);
  });
});
