import { describe, expect, it, vi } from "vitest";
import { createPickDictionaryFile } from "./pickDictionaryFile.ts";

describe("createPickDictionaryFile", () => {
  it("resolves the chosen file's name and path", async () => {
    const pick = createPickDictionaryFile(async () => "/dicts/jmdict.zip");
    expect(await pick()).toEqual({
      name: "jmdict.zip",
      source: { kind: "path", path: "/dicts/jmdict.zip" },
    });
  });

  it("resolves null when the dialog is cancelled", async () => {
    const pick = createPickDictionaryFile(async () => null);
    expect(await pick()).toBeNull();
  });

  it("limits the dialog to zip archives", async () => {
    const openFileDialog = vi.fn(async () => null);
    await createPickDictionaryFile(openFileDialog)();
    expect(openFileDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: "Dictionaries", extensions: ["zip"] }],
      }),
    );
  });
});
