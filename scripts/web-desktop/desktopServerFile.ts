import { existsSync, readFileSync } from "node:fs";

/** What a debug build of the desktop app records about its embedded server in `.dev/desktop-server.env`. */
export interface DesktopServerFile {
  url: string;
  token: string;
  /** Absent in files written before the desktop app recorded its storage paths. */
  storage: DesktopStorage | null;
}

export interface DesktopStorage {
  databasePath: string;
  cacheDir: string;
}

/** Reads the file, returning null when it does not exist or names no server. */
export function readDesktopServerFile(path: string): DesktopServerFile | null {
  if (!existsSync(path)) return null;
  return parseDesktopServerFile(readFileSync(path, "utf-8"));
}

export function parseDesktopServerFile(text: string): DesktopServerFile | null {
  const values = parseShellAssignments(text);
  const url = values.get("EASYIMMERSE_DESKTOP_SERVER_URL");
  const token = values.get("EASYIMMERSE_DESKTOP_TOKEN");
  if (!url || !token) return null;
  const databasePath = values.get("EASYIMMERSE_DESKTOP_DATABASE");
  const cacheDir = values.get("EASYIMMERSE_DESKTOP_CACHE_DIR");
  const storage = databasePath && cacheDir ? { databasePath, cacheDir } : null;
  return { url, token, storage };
}

/**
 * Reads `NAME=value` lines as a POSIX shell would, for the subset the desktop app writes:
 * plain characters, single-quoted text, and backslash-escaped characters.
 */
export function parseShellAssignments(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      values.set(match[1], unquoteShellWord(match[2]));
    }
  }
  return values;
}

function unquoteShellWord(word: string): string {
  let result = "";
  for (let index = 0; index < word.length; index++) {
    const character = word[index];
    if (character === "'") {
      const end = word.indexOf("'", index + 1);
      const close = end === -1 ? word.length : end;
      result += word.slice(index + 1, close);
      index = close;
    } else if (character === "\\") {
      index++;
      result += word[index] ?? "";
    } else {
      result += character;
    }
  }
  return result;
}
