import { describe, expect, it } from "vitest";
import {
  readStoredFileBytes,
  readStoredFileText,
} from "./storedFileEffects.ts";

describe("readStoredFileText", () => {
  it("rejects", async () => {
    await expect(readStoredFileText()).rejects.toThrow("browser");
  });
});

describe("readStoredFileBytes", () => {
  it("rejects", async () => {
    await expect(readStoredFileBytes()).rejects.toThrow("browser");
  });
});
