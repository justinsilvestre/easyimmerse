import { describe, expect, it } from "vitest";
import { isFetchDictionaryMediaMessage } from "./fetchDictionaryMediaMessage.ts";

describe("isFetchDictionaryMediaMessage", () => {
  it("accepts a message for a dictionary's file", () => {
    const message = {
      kind: "fetchDictionaryMedia",
      dictionaryId: "d1",
      path: "cat.png",
    };
    expect(isFetchDictionaryMediaMessage(message)).toBe(true);
  });

  it("rejects a message without a path", () => {
    const message = { kind: "fetchDictionaryMedia", dictionaryId: "d1" };
    expect(isFetchDictionaryMediaMessage(message)).toBe(false);
  });
});
