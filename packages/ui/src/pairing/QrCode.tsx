import { qrCodePath } from "./qrCodePath.ts";

/** Modules of light margin around the code, which scanners need to find it. */
const quietZone = 4;

/**
 * The QR code of the text, labelled for assistive technology.
 * It stays black on white in both themes, since many scanners cannot read a light code on a dark ground.
 */
export function QrCode({ text, label }: { text: string; label: string }) {
  const { size, path } = qrCodePath(text);
  const extent = size + quietZone * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-quietZone} ${-quietZone} ${extent} ${extent}`}
      shapeRendering="crispEdges"
      className="size-56 rounded-lg bg-white"
    >
      <path d={path} className="fill-black" />
    </svg>
  );
}
