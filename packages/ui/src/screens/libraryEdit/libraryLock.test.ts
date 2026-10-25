import { describe, expect, it } from "vitest";
import { isLibraryItemLocked, libraryLockText } from "./libraryLock.ts";

describe("isLibraryItemLocked", () => {
  it("locks an item being prepared", () => {
    expect(isLibraryItemLocked({ kind: "processing" })).toBe(true);
  });

  it("leaves a published item open to changes", () => {
    expect(isLibraryItemLocked({ kind: "published" })).toBe(false);
  });

  it("leaves a failed item open to changes", () => {
    expect(isLibraryItemLocked({ kind: "failed", message: "" })).toBe(false);
  });
});

describe("libraryLockText", () => {
  it("asks to wait while the item is being prepared, naming it", () => {
    expect(libraryLockText("change its words", "Im Park")).toBe(
      "Wait until the server has prepared “Im Park” for learners, then change its words.",
    );
  });
});
