import type { CapturedStory, CaptureManifest } from "./captureManifest.ts";

/** How a story differs between the two captures. */
export type ChangeKind = "added" | "removed" | "changed" | "errored";

export interface StoryChange extends CapturedStory {
  kind: ChangeKind;
  /** The variants whose screenshots differ, by file name, with how many pixels changed. */
  changedVariants: Record<string, number>;
  /** The error message of the earlier capture, when the story failed to render there. */
  errorBefore?: string;
}

/** Looks up how many pixels differ for a story in one variant, or null when either capture lacks the image. */
export type PixelDiff = (storyId: string, fileName: string) => number | null;

/** Lists the stories that were added, removed, changed, or broken between the two captures. */
export function classifyStories(
  before: CaptureManifest,
  after: CaptureManifest,
  pixelDiff: PixelDiff,
): StoryChange[] {
  const earlier = new Map(before.stories.map((story) => [story.id, story]));
  const later = new Set(after.stories.map((story) => story.id));
  const removed = before.stories
    .filter((story) => !later.has(story.id))
    .map((story) => change(story, "removed"));
  const rest = after.stories.flatMap((story) =>
    classifyStory(story, earlier.get(story.id), after, pixelDiff),
  );
  return [...rest, ...removed];
}

function classifyStory(
  story: CapturedStory,
  previous: CapturedStory | undefined,
  after: CaptureManifest,
  pixelDiff: PixelDiff,
): StoryChange[] {
  if (previous === undefined) return [change(story, "added")];
  if (story.error !== undefined) {
    return [change(story, "errored", {}, previous.error)];
  }
  const changedVariants = findChangedVariants(story, after, pixelDiff);
  const fixed = previous.error !== undefined;
  if (!fixed && Object.keys(changedVariants).length === 0) return [];
  return [change(story, "changed", changedVariants, previous.error)];
}

function findChangedVariants(
  story: CapturedStory,
  after: CaptureManifest,
  pixelDiff: PixelDiff,
): Record<string, number> {
  const changed: Record<string, number> = {};
  for (const variant of after.variants) {
    const fileName = `${variant.theme}-${variant.viewport.name}.png`;
    const pixels = pixelDiff(story.id, fileName);
    if (pixels !== null && pixels > 0) changed[fileName] = pixels;
  }
  return changed;
}

function change(
  story: CapturedStory,
  kind: ChangeKind,
  changedVariants: Record<string, number> = {},
  errorBefore?: string,
): StoryChange {
  const base = { ...story, kind, changedVariants };
  return errorBefore === undefined ? base : { ...base, errorBefore };
}
