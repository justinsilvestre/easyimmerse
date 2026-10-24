import { describe, expect, it } from "vitest";
import { libraryLockOf, libraryLockText } from "./libraryLock.ts";

describe("libraryLockOf", () => {
  it("locks an item being prepared", () => {
    expect(libraryLockOf({ kind: "processing" })).toBe("processing");
  });

  it("leaves a failed item open to changes", () => {
    expect(libraryLockOf({ kind: "failed", message: "" })).toBeNull();
  });
});

describe("libraryLockText", () => {
  it("asks to wait while the item is being prepared", () => {
    expect(libraryLockText("processing", "change its words")).toBe(
      "Wait until the item is prepared, then unpublish it to change its words.",
    );
  });
});
