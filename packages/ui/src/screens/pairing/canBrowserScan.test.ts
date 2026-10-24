import { describe, expect, it } from "vitest";
import { canBrowserScan } from "./canBrowserScan.ts";

const camera = { mediaDevices: { getUserMedia: () => undefined } };

describe("canBrowserScan", () => {
  it("allows a secure page with a barcode detector and a camera", () => {
    expect(
      canBrowserScan({
        BarcodeDetector: class {},
        isSecureContext: true,
        navigator: camera,
      }),
    ).toBe(true);
  });

  it("refuses a browser without a barcode detector", () => {
    expect(canBrowserScan({ isSecureContext: true, navigator: camera })).toBe(
      false,
    );
  });

  it("refuses a page served over plain HTTP from another device", () => {
    expect(
      canBrowserScan({
        BarcodeDetector: class {},
        isSecureContext: false,
        navigator: camera,
      }),
    ).toBe(false);
  });
});
