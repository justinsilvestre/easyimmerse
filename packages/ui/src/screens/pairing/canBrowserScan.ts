/** What a browser offers for reading QR codes through its camera. */
export type BrowserScanSupport = {
  BarcodeDetector?: unknown;
  isSecureContext?: boolean;
  navigator?: { mediaDevices?: { getUserMedia?: unknown } };
};

/**
 * Whether the browser can read a QR code through its camera: it has `BarcodeDetector` and a camera,
 * which browsers grant only to pages served over HTTPS or from the device itself.
 */
export function canBrowserScan(scope: BrowserScanSupport): boolean {
  return (
    scope.BarcodeDetector !== undefined &&
    scope.isSecureContext === true &&
    typeof scope.navigator?.mediaDevices?.getUserMedia === "function"
  );
}
