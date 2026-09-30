import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";

import {
  findGitHubToken,
  parseGitHubReleaseUrl,
  resolveAssetApiUrl,
} from "./githubReleaseAsset.ts";

export async function downloadToFile(
  url: string,
  destination: string,
): Promise<void> {
  const request = await resolveRequest(url);
  const response = await fetch(request.url, { headers: request.headers });
  if (!response.ok || !response.body) {
    throw new Error(`download failed: ${response.status} ${request.url}`);
  }
  await pipeline(
    Readable.fromWeb(response.body as ReadableStream),
    createWriteStream(destination),
  );
}

/**
 * GitHub release assets in private repositories are served only through the API, so a
 * release download URL is rewritten to its API form whenever a token is available.
 */
async function resolveRequest(
  url: string,
): Promise<{ url: string; headers: Record<string, string> }> {
  const asset = parseGitHubReleaseUrl(url);
  const token = asset && findGitHubToken();
  if (!asset || !token) return { url, headers: {} };
  return {
    url: await resolveAssetApiUrl(asset, token),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/octet-stream",
    },
  };
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
