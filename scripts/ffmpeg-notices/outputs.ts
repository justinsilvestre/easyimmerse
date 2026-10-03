import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { LicenseNotice } from "../../packages/licenses/src/index.ts";
import { renderNoticesText } from "./notices.ts";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const generatedDir = "packages/licenses/src/generated";

/** Renders the files the notices are published as, keyed by path from the repository root. */
export function renderOutputs(
  notices: LicenseNotice[],
): Record<string, string> {
  return {
    [`${generatedDir}/ffmpegNotices.json`]: `${JSON.stringify(notices, null, 2)}\n`,
    [`${generatedDir}/ffmpeg-notices.txt`]: renderNoticesText(notices),
  };
}

export function readOutputs(paths: string[]): Record<string, string | null> {
  return Object.fromEntries(
    paths.map((path) => [path, readOrNull(repoRoot + path)]),
  );
}

function readOrNull(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

export function writeOutputs(outputs: Record<string, string>): void {
  for (const [path, content] of Object.entries(outputs)) {
    writeFileSync(repoRoot + path, content);
  }
}
