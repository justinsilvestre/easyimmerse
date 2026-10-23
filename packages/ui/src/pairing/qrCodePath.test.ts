import { describe, expect, it } from "vitest";
import { qrCodePath } from "./qrCodePath.ts";

describe("qrCodePath", () => {
  it("draws a short URL on the smallest grid that holds it", () => {
    expect(qrCodePath("http://192.168.1.5:8787/#pair=123456").size).toBe(29);
  });

  it("starts with the dark corner of the top left finder pattern", () => {
    expect(
      qrCodePath("http://192.168.1.5:8787/").path.startsWith("M0 0h1v1h-1z"),
    ).toBe(true);
  });
});
