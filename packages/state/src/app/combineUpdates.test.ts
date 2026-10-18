import { describe, expect, it } from "vitest";
import { actions } from "./appAction.ts";
import { combineUpdates } from "./combineUpdates.ts";
import { updated } from "./updated.ts";

const pause = { type: "pausePlayer" } as const;
const play = { type: "playPlayer" } as const;

/** Counts plays, and asks for a pause on every play. */
const countPlays = combineUpdates<{ plays: number; label: string }, []>({
  plays: (plays, action) =>
    action.type === "playRequested"
      ? updated(plays + 1, pause)
      : updated(plays),
});

/** Passes its extra argument to every field's update. */
const withExtra = combineUpdates<{ first: string; second: string }, [string]>({
  first: (_first, _action, extra) => updated(`first ${extra}`, play),
  second: (_second, _action, extra) => updated(`second ${extra}`, pause),
});

describe("combineUpdates", () => {
  it("updates each field in the table with its own update", () => {
    const [state] = countPlays(
      { plays: 1, label: "a" },
      actions.playRequested(),
    );
    expect(state.plays).toBe(2);
  });

  it("keeps the fields the table leaves out", () => {
    const [state] = countPlays(
      { plays: 1, label: "a" },
      actions.playRequested(),
    );
    expect(state.label).toBe("a");
  });

  it("keeps the state's reference when no field changes", () => {
    const before = { plays: 1, label: "a" };
    const [state] = countPlays(before, actions.pauseRequested());
    expect(state).toBe(before);
  });

  it("passes the extra arguments to every field's update", () => {
    const [state] = withExtra(
      { first: "", second: "" },
      actions.playRequested(),
      "x",
    );
    expect(state).toEqual({ first: "first x", second: "second x" });
  });

  it("gathers the effects in the table's order", () => {
    const [, effects] = withExtra(
      { first: "", second: "" },
      actions.playRequested(),
      "x",
    );
    expect(effects).toEqual([play, pause]);
  });
});
