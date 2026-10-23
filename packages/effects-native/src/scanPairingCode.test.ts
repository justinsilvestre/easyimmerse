import { describe, expect, it } from "vitest";
import {
  type BarcodeScanner,
  createScanPairingCode,
} from "./scanPairingCode.ts";

const pairingUrl = "http://192.168.1.5:8787/#pair=123456";

/** A scanner whose camera permission starts as `permission`, becomes `granted` when asked, and reads the given text. */
function fakeScanner(
  permission: string,
  granted = "granted",
  read: () => Promise<string> = async () => pairingUrl,
): BarcodeScanner {
  return {
    checkPermissions: async () => permission,
    requestPermissions: async () => granted,
    scanQrCode: read,
  };
}

describe("createScanPairingCode", () => {
  it("reads the QR code on a phone that may use the camera", async () => {
    const scan = createScanPairingCode("mobile", fakeScanner("granted"));
    expect(await scan()).toEqual({ kind: "read", text: pairingUrl });
  });

  it("asks for the camera before the first scan", async () => {
    const scan = createScanPairingCode("mobile", fakeScanner("prompt"));
    expect(await scan()).toEqual({ kind: "read", text: pairingUrl });
  });

  it("reports a refused camera as unavailable", async () => {
    const scan = createScanPairingCode(
      "mobile",
      fakeScanner("prompt", "denied"),
    );
    expect(await scan()).toEqual({ kind: "cameraUnavailable" });
  });

  it("reports a cancelled scan as closed", async () => {
    const cancelled = async () => {
      throw new Error("cancelled");
    };
    const scan = createScanPairingCode(
      "mobile",
      fakeScanner("granted", "granted", cancelled),
    );
    expect(await scan()).toEqual({ kind: "closed" });
  });

  it("reports no camera on a desktop", async () => {
    const scan = createScanPairingCode("desktop", fakeScanner("granted"));
    expect(await scan()).toEqual({ kind: "cameraUnavailable" });
  });
});
