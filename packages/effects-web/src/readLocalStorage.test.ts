import { describe, expect, it } from "vitest";
import { readLocalStorage } from "./readLocalStorage.ts";

describe("readLocalStorage", () => {
  it("returns the page's storage", () => {
    const storage = new Storage();
    expect(readLocalStorage({ localStorage: storage })).toBe(storage);
  });

  it("returns null when the browser blocks the storage", () => {
    const blocked = {
      get localStorage(): Storage {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    };
    expect(readLocalStorage(blocked)).toBeNull();
  });
});
