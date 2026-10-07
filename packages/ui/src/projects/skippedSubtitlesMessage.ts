import type { AvailableSubtitle, SkippedSubtitle } from "@easyimmerse/types";

/**
 * Says which of the chosen subtitle tracks were not added and why, naming each as the
 * source offered it, or null when every track was added.
 */
export function skippedSubtitlesMessage(
  skipped: readonly SkippedSubtitle[],
  offered: readonly AvailableSubtitle[],
): string | null {
  if (skipped.length === 0) return null;
  return skipped
    .map(({ id, reason }) => {
      const name = offered.find((subtitle) => subtitle.id === id)?.name ?? id;
      return `The subtitles “${name}” were not added: ${reason}.`;
    })
    .join(" ");
}
