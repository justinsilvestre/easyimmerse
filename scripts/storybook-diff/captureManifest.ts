import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CaptureVariant } from "./captureVariants.ts";
import type { StoryEntry } from "./storyIndex.ts";

/** Describes a capture directory: which variants it holds and which stories, with their failures. */
export interface CaptureManifest {
  variants: CaptureVariant[];
  stories: CapturedStory[];
}

export interface CapturedStory extends StoryEntry {
  /** Why no screenshot could be taken, when the story failed to render in some variant. */
  error?: string;
}

const manifestFileName = "manifest.json";

export function writeManifest(
  captureDir: string,
  manifest: CaptureManifest,
): Promise<void> {
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  return writeFile(join(captureDir, manifestFileName), text);
}

export async function readManifest(
  captureDir: string,
): Promise<CaptureManifest> {
  const text = await readFile(join(captureDir, manifestFileName), "utf8");
  return JSON.parse(text);
}
