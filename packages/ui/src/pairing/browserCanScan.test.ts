import { describe, expect, it } from "vitest";
import { browserCanScan } from "./browserCanScan.ts";

const camera = { mediaDevices: { getUserMedia: () => undefined } };

describe("browserCanScan", () => {
  it("allows a secure page with a barcode detector and a camera", () => {
    expect(
      browserCanScan({
        BarcodeDetector: class {},
        isSecureContext: true,
        navigator: camera,
      }),
    ).toBe(true);
  });

  it("refuses a browser without a barcode detector", () => {
    expect(browserCanScan({ isSecureContext: true, navigator: camera })).toBe(
      false,
    );
  });

  it("refuses a page served over plain HTTP from another device", () => {
    expect(
      browserCanScan({
        BarcodeDetector: class {},
        isSecureContext: false,
        navigator: camera,
      }),
    ).toBe(false);
  });
});
