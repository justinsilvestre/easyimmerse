import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  parseDismissedSuggestions,
  selectHasDismissedSuggestions,
  selectIsSuggestionDismissed,
} from "./dismissedSuggestions.ts";

const rootAfter = (...before: Parameters<typeof stateAfter>) => ({
  app: stateAfter(...before),
});

describe("parseDismissedSuggestions", () => {
  it("returns no suggestions while the preference is unset", () => {
    expect(parseDismissedSuggestions(undefined)).toEqual([]);
  });

  it("returns no suggestions for a value that is not JSON", () => {
    expect(parseDismissedSuggestions("backup")).toEqual([]);
  });

  it("leaves out ids it does not know", () => {
    expect(parseDismissedSuggestions('["backup","later"]')).toEqual(["backup"]);
  });
});

describe("selectIsSuggestionDismissed", () => {
  it("returns false for a suggestion never dismissed", () => {
    expect(selectIsSuggestionDismissed("backup")(rootAfter())).toBe(false);
  });

  it("returns true once the suggestion is dismissed", () => {
    const root = rootAfter(actions.suggestionDismissed("backup"));
    expect(selectIsSuggestionDismissed("backup")(root)).toBe(true);
  });

  it("returns false once the dismissed suggestions are shown again", () => {
    const root = rootAfter(
      actions.suggestionDismissed("backup"),
      actions.dismissedSuggestionsRestored(),
    );
    expect(selectIsSuggestionDismissed("backup")(root)).toBe(false);
  });

  it("returns true for a suggestion dismissed in an earlier session", () => {
    const root = rootAfter(
      actions.preferencesLoaded({ dismissedSuggestions: '["backup"]' }),
    );
    expect(selectIsSuggestionDismissed("backup")(root)).toBe(true);
  });
});

describe("selectHasDismissedSuggestions", () => {
  it("returns false while no suggestion is dismissed", () => {
    expect(selectHasDismissedSuggestions(rootAfter())).toBe(false);
  });

  it("returns true once a suggestion is dismissed", () => {
    const root = rootAfter(actions.suggestionDismissed("backup"));
    expect(selectHasDismissedSuggestions(root)).toBe(true);
  });
});
