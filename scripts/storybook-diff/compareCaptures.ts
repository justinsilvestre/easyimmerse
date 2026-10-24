import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PNG } from "pngjs";

import { readManifest } from "./captureManifest.ts";
import type { CaptureVariant } from "./captureVariants.ts";
import { classifyStories, type StoryChange } from "./classifyStories.ts";
import { type Area, diffImages, type ImageDiff } from "./diffImages.ts";
import { pngSize } from "./pngSize.ts";
import { shownFileNames } from "./shownFileNames.ts";

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
  changes: ReportedChange[];
}

export interface ReportedChange extends StoryChange {
  /** The size of each image beside the report, by its path under the story's directory, such as `before-light-phone.png`. */
  imageSizes: Record<string, { width: number; height: number }>;
  /** The rectangle around the changes in each changed variant, by its file name, such as `light-phone.png`. */
  changedAreas: Record<string, Area>;
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
  const reported: ReportedChange[] = [];
  for (const change of changes) {
    const imageSizes = await writeChangeImages(
      options,
      diffs,
      change,
      after.variants,
    );
    const changedAreas: ReportedChange["changedAreas"] = {};
    for (const fileName of Object.keys(change.changedVariants)) {
      const area = diffs.get(`${change.id}/${fileName}`)?.area;
      if (area) changedAreas[fileName] = area;
    }
    reported.push({ ...change, imageSizes, changedAreas });
  }
  const report = {
    variants: after.variants,
    storyCount: after.stories.length,
    changes: reported,
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

/** Copies a story's shown screenshots and writes its diff images, returning the size of each screenshot copied. */
async function writeChangeImages(
  options: CompareOptions,
  diffs: Map<string, ImageDiff>,
  change: StoryChange,
  variants: CaptureVariant[],
): Promise<ReportedChange["imageSizes"]> {
  const dir = join(options.outputDir, change.id);
  await mkdir(dir, { recursive: true });
  const sizes: ReportedChange["imageSizes"] = {};
  const copy = (captureDir: string, side: string, fileName: string) => {
    const from = join(captureDir, change.id, fileName);
    if (!existsSync(from)) return Promise.resolve();
    sizes[`${side}-${fileName}`] = pngSize(readFileSync(from));
    return copyFile(from, join(dir, `${side}-${fileName}`));
  };
  for (const fileName of shownFileNames(change, variants)) {
    if (change.kind !== "added") {
      await copy(options.beforeDir, "before", fileName);
    }
    if (change.kind !== "removed" && change.kind !== "errored") {
      await copy(options.afterDir, "after", fileName);
    }
    const diff = diffs.get(`${change.id}/${fileName}`);
    if (diff !== undefined && diff.pixelsChanged > 0) {
      await writeFile(join(dir, `diff-${fileName}`), PNG.sync.write(diff.diff));
    }
  }
  return sizes;
}
