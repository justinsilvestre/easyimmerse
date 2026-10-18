import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { failureNotices } from "./failureNotices.ts";
import { cueSeekCommands } from "./mediaScreen/cueSeekCommands.ts";
import { skippedSourceSubtitles } from "./mediaScreen/sourceMedia/skippedSourceSubtitles.ts";
import { markOpenedBy } from "./projectScreen/projectOpenedBy.ts";
import { translationDocumentRequests } from "./readerScreen/translationDocumentRequests.ts";

/**
 * Returns the screens' effects that change no state: the notices of failed changes and of source subtitles that were skipped,
 * which tell of them even once their screen has closed, the record that a project was opened,
 * the save of the translation a book is paired with, and the seeks that skip between the media screen's cues.
 */
export function screenCommands(
  action: AppAction,
  app: Pick<ReadableState, "route" | "screen" | "backend">,
) {
  return [
    ...cueSeekCommands(action, app),
    ...failureNotices(action),
    ...skippedSourceSubtitles(action),
    ...markOpenedBy(app, action),
    ...translationDocumentRequests(action),
  ];
}
