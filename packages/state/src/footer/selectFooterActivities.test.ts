import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { startedDictionaryImport } from "../dictionaryImport/dictionaryImportExamples.ts";
import { selectFooterActivities } from "./selectFooterActivities.ts";

const closeSettings = actions.navigated({ type: "closeSettings" });

describe("selectFooterActivities", () => {
  it("lists a dictionary import once the dictionaries page closes", () => {
    const app = stateAfter(...startedDictionaryImport, closeSettings);
    expect(selectFooterActivities({ app }).map(({ id }) => id)).toEqual([
      "dictionary-import",
    ]);
  });

  it("leaves out a dictionary import while the dictionaries page is on top", () => {
    const app = stateAfter(...startedDictionaryImport);
    expect(selectFooterActivities({ app })).toEqual([]);
  });

  it("lists a dictionary import while General is on top of the dictionaries page", () => {
    const app = stateAfter(
      ...startedDictionaryImport,
      closeSettings,
      actions.navigated({ type: "openSettings" }),
    );
    expect(selectFooterActivities({ app })).toHaveLength(1);
  });

  it("lists nothing while nothing is under way", () => {
    expect(selectFooterActivities({ app: stateAfter() })).toEqual([]);
  });

  it("keeps its reference while the activities stay the same", () => {
    const app = stateAfter(...startedDictionaryImport, closeSettings);
    const first = selectFooterActivities({ app });
    const later = { ...app, notices: { ...app.notices } };
    expect(selectFooterActivities({ app: later })).toBe(first);
  });
});
