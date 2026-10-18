import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { isAborted } from "../../server/isAborted.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { OfflineScreenState } from "../screenState.ts";

const parseRequestId = "offline/parseTimedText";

/** Parses a picked subtitles file and keeps its cues, or the failure, for the offline screen to show. */
export function updateOfflineScreen(
  screen: OfflineScreenState,
  action: AppAction,
) {
  switch (action.type) {
    case "subtitleFileChosen":
      return updated(
        { ...screen, cues: [], hasFailed: false },
        {
          type: "sendRequest",
          id: parseRequestId,
          request: {
            kind: "parseTimedText",
            request: { source: action.file.source, format: null },
          },
        },
      );
    case "requestSettled":
      // A parse aborted as an earlier offline screen closed says nothing about the file picked on this one.
      if (
        !isSettled(action, parseRequestId, "parseTimedText") ||
        isAborted(action.outcome)
      )
        return updated(screen);
      return updated(
        action.outcome.ok
          ? { ...screen, cues: action.outcome.data.cues }
          : { ...screen, hasFailed: true },
      );
    default:
      return updated(screen);
  }
}

/** Stops parsing the picked subtitles file, as the offline screen closes. */
export const abortParse = {
  type: "abortRequest",
  id: parseRequestId,
} satisfies Effect;
