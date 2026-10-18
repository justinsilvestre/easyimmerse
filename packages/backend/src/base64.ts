/** How many bytes go into one call of `String.fromCharCode`, which takes its arguments on the stack. */
const chunkSize = 0x8000;

/** Encodes bytes in base64, as AnkiConnect takes a media file's data. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += chunkSize)
    binary += String.fromCharCode(...bytes.subarray(start, start + chunkSize));
  return btoa(binary);
}
