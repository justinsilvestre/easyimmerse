import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";

export async function downloadToFile(
  url: string,
  destination: string,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`download failed: ${response.status} ${url}`);
  }
  await pipeline(
    Readable.fromWeb(response.body as ReadableStream),
    createWriteStream(destination),
  );
}

export async function sha256OfFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

/** Throws unless the file's SHA-256 matches the expected hex digest. */
export async function verifySha256(
  path: string,
  expected: string,
): Promise<void> {
  const actual = await sha256OfFile(path);
  if (actual !== expected.toLowerCase()) {
    throw new Error(
      `checksum mismatch for ${path}: expected ${expected}, got ${actual}`,
    );
  }
}
