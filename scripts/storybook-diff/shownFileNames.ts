import { type CaptureVariant, variantFileName } from "./captureVariants.ts";
import type { StoryChange } from "./classifyStories.ts";

/**
 * Lists the screenshots the report shows for a story.
 * A changed story shows each viewport that differs in any theme, in every theme, so that switching themes keeps the same layout.
 * Every other kind shows all variants.
 */
export function shownFileNames(
  change: StoryChange,
  variants: CaptureVariant[],
): string[] {
  const changed = variants.filter(
    (variant) => variantFileName(variant) in change.changedVariants,
  );
  if (change.kind !== "changed" || changed.length === 0) {
    return variants.map(variantFileName);
  }
  const viewports = new Set(changed.map((variant) => variant.viewport.name));
  return variants
    .filter((variant) => viewports.has(variant.viewport.name))
    .map(variantFileName);
}
