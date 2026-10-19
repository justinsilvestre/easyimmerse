import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PNG } from "pngjs";

import { readManifest } from "./captureManifest.ts";
import { type CaptureVariant, variantFileName } from "./captureVariants.ts";
import { classifyStories, type StoryChange } from "./classifyStories.ts";
import { diffImages, type ImageDiff } from "./diffImages.ts";

export interface CompareOptions {
  beforeDir: string;
  afterDir: string;
  outputDir: string;
}

/** What `changes.json` holds: the stories that differ, with the images beside it under each story's id. */
export interface ComparisonReport {
  variants: CaptureVariant[];
  /** How many stories the later capture holds. */
  storyCount: number;
  changes: StoryChange[];
}

/**
 * Compares two capture directories and writes a self-contained report directory:
 * `changes.json`, and for each changed story its before, after, and diff images.
 */
export async function compareCaptures(
  options: CompareOptions,
): Promise<ComparisonReport> {
  const before = await readManifest(options.beforeDir);
  const after = await readManifest(options.afterDir);
  const diffs = new Map<string, ImageDiff>();
  const changes = classifyStories(before, after, (storyId, fileName) =>
    diffStoredImages(options, diffs, storyId, fileName),
  );
  await mkdir(options.outputDir, { recursive: true });
  for (const change of changes) {
    await writeChangeImages(options, diffs, change, after.variants);
  }
  const report = {
    variants: after.variants,
    storyCount: after.stories.length,
    changes,
  };
  await writeFile(
    join(options.outputDir, "changes.json"),
    JSON.stringify(report, null, 2),
  );
  return report;
}

function diffStoredImages(
  options: CompareOptions,
  diffs: Map<string, ImageDiff>,
  storyId: string,
  fileName: string,
): number | null {
  const beforePath = join(options.beforeDir, storyId, fileName);
  const afterPath = join(options.afterDir, storyId, fileName);
  if (!existsSync(beforePath) || !existsSync(afterPath)) return null;
  const before = readFileSync(beforePath);
  const after = readFileSync(afterPath);
  // Chromium encodes the same pixels to the same bytes, so most pairs need no decoding.
  if (before.equals(after)) return 0;
  const diff = diffImages(PNG.sync.read(before), PNG.sync.read(after));
  diffs.set(`${storyId}/${fileName}`, diff);
  return diff.pixelsChanged;
}

async function writeChangeImages(
  options: CompareOptions,
  diffs: Map<string, ImageDiff>,
  change: StoryChange,
  variants: CaptureVariant[],
): Promise<void> {
  const dir = join(options.outputDir, change.id);
  await mkdir(dir, { recursive: true });
  for (const fileName of fileNamesToCopy(change, variants)) {
    const storyDir = (captureDir: string) =>
      join(captureDir, change.id, fileName);
    if (change.kind !== "added") {
      await copyIfExists(
        storyDir(options.beforeDir),
        join(dir, `before-${fileName}`),
      );
    }
    if (change.kind !== "removed" && change.kind !== "errored") {
      await copyIfExists(
        storyDir(options.afterDir),
        join(dir, `after-${fileName}`),
      );
    }
    const diff = diffs.get(`${change.id}/${fileName}`);
    if (diff !== undefined && diff.pixelsChanged > 0) {
      await writeFile(join(dir, `diff-${fileName}`), PNG.sync.write(diff.diff));
    }
  }
}

/** A changed story shows only the variants that differ; every other kind shows all of them. */
function fileNamesToCopy(
  change: StoryChange,
  variants: CaptureVariant[],
): string[] {
  const changed = Object.keys(change.changedVariants);
  if (change.kind === "changed" && changed.length > 0) return changed;
  return variants.map(variantFileName);
}

async function copyIfExists(from: string, to: string): Promise<void> {
  if (existsSync(from)) await copyFile(from, to);
}
