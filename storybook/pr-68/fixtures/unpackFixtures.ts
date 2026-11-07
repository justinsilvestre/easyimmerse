import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

/** Decompresses each `.gz` file in the directory into a sibling without that extension, replacing any earlier copy. */
export function unpackFixtures(directory = import.meta.dirname): void {
  for (const name of readdirSync(directory)) {
    if (!name.endsWith(".gz")) continue;
    const unpacked = gunzipSync(readFileSync(join(directory, name)));
    writeFileSync(join(directory, name.slice(0, -".gz".length)), unpacked);
  }
}

if (import.meta.main) unpackFixtures();
