import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { selectRemovingDictionaryIds } from "./selectRemovingDictionaryIds.ts";

const openDictionaries = actions.navigated({ type: "openDictionaries" });

const removalOfD1 = [
  openDictionaries,
  actions.dictionaryRemovalRequested("d1"),
  actions.dictionaryRemovalConfirmed("d1"),
];

describe("selectRemovingDictionaryIds", () => {
  it("lists the dictionaries whose removal is in flight", () => {
    const app = stateAfter(...removalOfD1);
    expect(selectRemovingDictionaryIds({ app })).toEqual(["d1"]);
  });

  it("forgets a removal once it has settled", () => {
    const app = stateAfter(
      ...removalOfD1,
      actions.requestSettled(
        "settings/dictionaries/remove/d1",
        { kind: "deleteDictionary", dictionaryId: "d1" },
        { ok: false, error: { status: 500, message: "down" } },
      ),
    );
    expect(selectRemovingDictionaryIds({ app })).toEqual([]);
  });

  it("keeps its result while only other requests change", () => {
    const before = stateAfter(...removalOfD1);
    const after = stateAfter(
      ...removalOfD1,
      actions.navigated({ type: "closeSettings" }),
      actions.navigated({ type: "openProject", projectId: "p1" }),
    );
    expect(selectRemovingDictionaryIds({ app: after })).toBe(
      selectRemovingDictionaryIds({ app: before }),
    );
  });
});
