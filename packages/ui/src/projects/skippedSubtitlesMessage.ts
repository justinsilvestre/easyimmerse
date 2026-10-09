import type { PluginForm, SkippedSubtitle } from "@easyimmerse/types";

/**
 * Says which of the chosen subtitle tracks were not added and why, or null when every track was added.
 * Each track is named by the option the plugin's form offered it as, or else by its id.
 */
export function skippedSubtitlesMessage(
  skipped: readonly SkippedSubtitle[],
  form: PluginForm | null,
): string | null {
  if (skipped.length === 0) return null;
  const options = (form?.fields ?? []).flatMap(({ control }) =>
    control.kind === "choose-one" || control.kind === "choose-many"
      ? control.options
      : [],
  );
  return skipped
    .map(({ id, reason }) => {
      const name = options.find((option) => option.id === id)?.label ?? id;
      return `The subtitles “${name}” were not added: ${reason}.`;
    })
    .join(" ");
}
