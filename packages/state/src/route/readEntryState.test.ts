import { describe, expect, it } from "vitest";
import { readEntryState } from "./readEntryState.ts";

describe("readEntryState", () => {
  it("reads the state the app kept, among the history's own keys", () => {
    expect(
      readEntryState({ previousPath: "/", origin: "app", __TSR_index: 2 }),
    ).toEqual({ previousPath: "/", origin: "app" });
  });

  it("reads the settings section the entry scrolls to", () => {
    expect(
      readEntryState({
        previousPath: null,
        origin: "app",
        scrollTarget: "mediaConversion",
      }),
    ).toEqual({
      previousPath: null,
      origin: "app",
      scrollTarget: "mediaConversion",
    });
  });

  it("returns null for an entry the app did not write", () => {
    expect(readEntryState({ __TSR_index: 0, key: "k" })).toBeNull();
  });

  it("returns null for an entry without state", () => {
    expect(readEntryState(null)).toBeNull();
  });
});
