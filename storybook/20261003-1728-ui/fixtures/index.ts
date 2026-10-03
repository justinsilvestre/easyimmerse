import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Returns the absolute path of the fixture file with the given name. */
export function fixturePath(name: string): string {
  return fileURLToPath(new URL(name, import.meta.url));
}

/** Reads a fixture file as UTF-8 text. */
export function readFixtureText(name: string): string {
  return readFileSync(fixturePath(name), "utf-8");
}

/** Reads a fixture file as raw bytes. */
export function readFixtureBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(fixturePath(name)));
}
