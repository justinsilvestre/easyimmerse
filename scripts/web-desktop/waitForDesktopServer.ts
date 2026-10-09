import { existsSync, readFileSync } from "node:fs";
import { setTimeout } from "node:timers/promises";

import {
  type DesktopServerFile,
  parseDesktopServerFile,
} from "./desktopServerFile.ts";
import { probeServer } from "./probeServer.ts";

/**
 * Checks the desktop server file at an interval until it differs from `previousText`
 * and names a server that accepts its token. Waits without a limit.
 */
export async function waitForDesktopServer(
  path: string,
  previousText: string | null,
  intervalMs = 1000,
): Promise<DesktopServerFile> {
  for (;;) {
    const file = parseFreshServerFile(previousText, readTextOrNull(path));
    if (file && (await probeServer(file.url, file.token)) === "answering") {
      return file;
    }
    await setTimeout(intervalMs);
  }
}

/** Parses the file's current text, unless the file is missing or unchanged. */
export function parseFreshServerFile(
  previousText: string | null,
  currentText: string | null,
): DesktopServerFile | null {
  if (currentText === null || currentText === previousText) return null;
  return parseDesktopServerFile(currentText);
}

export function readTextOrNull(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf-8") : null;
}
