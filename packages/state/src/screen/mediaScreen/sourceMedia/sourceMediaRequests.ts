import type { FormInput, PluginForm } from "@easyimmerse/types";
import type { Effect } from "../../../app/effect.ts";
import type { MediaRoute } from "../../../route/route.ts";

/** The ids of the requests that a media file's source dialog sends. */
export const sourceMediaIds = (mediaFileId: string) => ({
  form: `media/${mediaFileId}/sourceMedia/form`,
  step: `media/${mediaFileId}/sourceMedia/step`,
});

/** Asks the plugin the media file was imported through for the first form of its media interface. */
export function sourceFormRequest({
  projectId,
  mediaFileId,
}: MediaRoute): Effect {
  return {
    type: "sendRequest",
    id: sourceMediaIds(mediaFileId).form,
    request: { kind: "getSourceForm", projectId, mediaFileId },
  };
}

/** Sends an action of the plugin's form with what the user entered, along with the form it was taken on. */
export function sourceStepRequest(
  { projectId, mediaFileId }: MediaRoute,
  action: string,
  input: FormInput[],
  form: PluginForm | null,
): Effect {
  return {
    type: "sendRequest",
    id: sourceMediaIds(mediaFileId).step,
    request: {
      kind: "submitSourceStep",
      projectId,
      mediaFileId,
      request: { action, input },
      form,
    },
  };
}

/**
 * Stops the source dialog's form request, whose answer nothing would read once the dialog closes.
 * A step is left to finish: the server applies the plugin's changes either way, and its answer
 * replaces the cached tracks, where an aborted step would refetch them before the changes are applied.
 */
export function endSourceMedia(mediaFileId: string): Effect[] {
  return [{ type: "abortRequest", id: sourceMediaIds(mediaFileId).form }];
}
