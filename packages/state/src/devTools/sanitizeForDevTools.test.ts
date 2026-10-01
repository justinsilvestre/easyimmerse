import { describe, expect, it } from "vitest";
import { sanitizeForDevTools } from "./sanitizeForDevTools.ts";

describe("sanitizeForDevTools", () => {
  it("replaces a byte array with a placeholder giving its length", () => {
    expect(sanitizeForDevTools(new Uint8Array(3))).toBe("<Uint8Array 3 bytes>");
  });

  it("replaces an ArrayBuffer with a placeholder giving its length", () => {
    expect(sanitizeForDevTools(new ArrayBuffer(5))).toBe(
      "<ArrayBuffer 5 bytes>",
    );
  });

  it("replaces a long data URL with a placeholder giving its length", () => {
    const dataUrl = `data:image/png;base64,${"A".repeat(2000)}`;
    expect(sanitizeForDevTools(dataUrl)).toBe("<data URL 2022 characters>");
  });

  it("keeps a short data URL", () => {
    expect(sanitizeForDevTools("data:,hi")).toBe("data:,hi");
  });

  it("replaces byte arrays nested in objects and arrays", () => {
    const value = { file: { bytes: [new Uint8Array(2)] }, name: "d.zip" };
    expect(sanitizeForDevTools(value)).toEqual({
      file: { bytes: ["<Uint8Array 2 bytes>"] },
      name: "d.zip",
    });
  });

  it("returns a value without binary data unchanged", () => {
    const value = { player: { volume: 1, loop: null }, tags: ["a"] };
    expect(sanitizeForDevTools(value)).toBe(value);
  });

  it("leaves class instances other than binary data alone", () => {
    const value = { date: new Date(0) };
    expect(sanitizeForDevTools(value)).toBe(value);
  });
});
