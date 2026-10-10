import type {
  MediaSourceJob,
  PluginForm,
  SkippedSubtitle,
} from "@easyimmerse/types";
import type { Effect } from "../../app/effect.ts";
import { transientNotice } from "../../notices/transientNotice.ts";

/** Names in a notice the chosen subtitle tracks that a fetch did not add, once the fetch has added its file. */
export function skippedSubtitlesNotice(
  job: MediaSourceJob,
  form: PluginForm | null,
) {
  return job.status === "done" && job.media_file !== null
    ? skippedSubtitlesEffects(job.skipped_subtitles, form)
    : [];
}

/** Names in a notice the chosen subtitle tracks that were not added, or returns no effect when every track was added. */
export function skippedSubtitlesEffects(
  skipped: readonly SkippedSubtitle[],
  form: PluginForm | null,
) {
  const message = skippedSubtitlesMessage(skipped, form);
  return message === null
    ? []
    : ([
        { type: "showNotice", content: transientNotice("danger", message) },
      ] satisfies Effect[]);
}

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
