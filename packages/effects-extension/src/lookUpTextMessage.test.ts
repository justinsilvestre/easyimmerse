import { describe, expect, it } from "vitest";
import { isLookUpTextMessage } from "./lookUpTextMessage.ts";

describe("isLookUpTextMessage", () => {
  it("accepts a lookup message", () => {
    const message = {
      kind: "lookUpText",
      query: { text: "Hund", language: "de" },
    };
    expect(isLookUpTextMessage(message)).toBe(true);
  });

  it("rejects a message of another kind", () => {
    expect(isLookUpTextMessage({ kind: "other", query: {} })).toBe(false);
  });

  it("rejects a value that is not a message", () => {
    expect(isLookUpTextMessage("lookUpText")).toBe(false);
  });
});
