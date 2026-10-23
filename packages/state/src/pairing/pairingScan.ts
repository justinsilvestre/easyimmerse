/**
 * How a scan for a pairing QR code ended: it read the text the code holds, the person closed the camera,
 * or the camera could not be used because it was refused or the device has none.
 */
export type PairingScan =
  | { kind: "read"; text: string }
  | { kind: "closed" }
  | { kind: "cameraUnavailable" };

/** Why a scan ended without a QR code. */
export type PairingScanStop = Exclude<PairingScan, { kind: "read" }>["kind"];
