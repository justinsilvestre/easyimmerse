import type { NativePlatform } from "@easyimmerse/backend";
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

const pluginScanner: BarcodeScanner = {
  checkPermissions,
  requestPermissions,
  scanQrCode: async () =>
    (await scan({ formats: [Format.QRCode], windowed: false })).content,
};

/**
 * Builds the scan of a pairing QR code: the phone's camera through the barcode scanner plugin, after asking for the camera when needed.
 * A desktop has no scanner. A refused camera or a cancelled scan resolves with null.
 */
export function createScanPairingCode(
  platform: NativePlatform,
  scanner: BarcodeScanner = pluginScanner,
): () => Promise<string | null> {
  if (platform !== "mobile") return async () => null;
  return async () => {
    try {
      if (!(await hasCamera(scanner))) return null;
      return await scanner.scanQrCode();
    } catch {
      return null;
    }
  };
}

async function hasCamera(scanner: BarcodeScanner): Promise<boolean> {
  if ((await scanner.checkPermissions()) === "granted") return true;
  return (await scanner.requestPermissions()) === "granted";
}
