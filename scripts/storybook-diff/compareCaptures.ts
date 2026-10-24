import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PNG } from "pngjs";

import { readManifest } from "./captureManifest.ts";
import type { CaptureVariant } from "./captureVariants.ts";
import { classifyStories, type StoryChange } from "./classifyStories.ts";
import { type ColumnRange, contentColumns } from "./contentColumns.ts";
import { diffImages, type ImageDiff } from "./diffImages.ts";
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
  /** The columns that hold content, by variant file name, for the variants with wide plain margins beside it. */
  contentColumns: Record<string, ColumnRange>;
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
    reported.push({
      ...change,
      ...(await writeChangeImages(options, diffs, change, after.variants)),
    });
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

/**
 * Copies a story's shown screenshots and writes its diff images.
 * Returns the size of each screenshot copied, and where each variant's content lies between plain margins.
 */
async function writeChangeImages(
  options: CompareOptions,
  diffs: Map<string, ImageDiff>,
  change: StoryChange,
  variants: CaptureVariant[],
): Promise<Pick<ReportedChange, "imageSizes" | "contentColumns">> {
  const dir = join(options.outputDir, change.id);
  await mkdir(dir, { recursive: true });
  const imageSizes: ReportedChange["imageSizes"] = {};
  const columns: ReportedChange["contentColumns"] = {};
  const copy = async (captureDir: string, side: string, fileName: string) => {
    const from = join(captureDir, change.id, fileName);
    if (!existsSync(from)) return null;
    const bytes = readFileSync(from);
    imageSizes[`${side}-${fileName}`] = pngSize(bytes);
    await copyFile(from, join(dir, `${side}-${fileName}`));
    return bytes;
  };
  for (const fileName of shownFileNames(change, variants)) {
    const screenshots: PNG[] = [];
    const before =
      change.kind !== "added" &&
      (await copy(options.beforeDir, "before", fileName));
    const after =
      change.kind !== "removed" &&
      change.kind !== "errored" &&
      (await copy(options.afterDir, "after", fileName));
    for (const bytes of [before, after]) {
      if (bytes) screenshots.push(PNG.sync.read(bytes));
    }
    const diff = diffs.get(`${change.id}/${fileName}`);
    if (diff !== undefined && diff.pixelsChanged > 0) {
      await writeFile(join(dir, `diff-${fileName}`), PNG.sync.write(diff.diff));
    }
    const content = contentColumns(screenshots);
    if (content) columns[fileName] = content;
  }
  return { imageSizes, contentColumns: columns };
}
