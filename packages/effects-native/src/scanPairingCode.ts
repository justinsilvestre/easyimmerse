import type { NativePlatform } from "@easyimmerse/backend";
import type { PairingScan } from "@easyimmerse/state";
import {
  checkPermissions,
  Format,
  requestPermissions,
  scan,
} from "@tauri-apps/plugin-barcode-scanner";

/** The parts of the barcode scanner plugin that reading a pairing QR code uses. */
export type BarcodeScanner = {
  checkPermissions: () => Promise<string>;
  requestPermissions: () => Promise<string>;
  scanQrCode: () => Promise<string>;
};

const pluginScanner = {
  checkPermissions,
  requestPermissions,
  scanQrCode: async () =>
    (await scan({ formats: [Format.QRCode], windowed: false })).content,
} satisfies BarcodeScanner;

/**
 * Builds the scan of a pairing QR code: the phone's camera through the barcode scanner plugin, after asking for the camera when needed.
 * A desktop has no scanner and a refused camera cannot be used; a scan the person cancels counts as closed.
 */
export function createScanPairingCode(
  platform: NativePlatform,
  scanner: BarcodeScanner = pluginScanner,
): () => Promise<PairingScan> {
  if (platform !== "mobile") return async () => cameraUnavailable;
  return async () => {
    try {
      if (!(await hasCamera(scanner))) return cameraUnavailable;
      return { kind: "read", text: await scanner.scanQrCode() };
    } catch {
      return { kind: "closed" };
    }
  };
}

const cameraUnavailable = { kind: "cameraUnavailable" } satisfies PairingScan;

async function hasCamera(scanner: BarcodeScanner): Promise<boolean> {
  if ((await scanner.checkPermissions()) === "granted") return true;
  return (await scanner.requestPermissions()) === "granted";
}
