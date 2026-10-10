import type { AppAction } from "../app/appAction.ts";
import type { RouteApp } from "../route/updateRoute.ts";
import { failureNotices } from "./failureNotices.ts";
import { skippedSourceSubtitles } from "./mediaScreen/sourceMedia/skippedSourceSubtitles.ts";
import { markOpenedBy } from "./projectScreen/projectOpenedBy.ts";

/**
 * Returns the screens' effects that change no state: the notices of failed changes and of source subtitles that were skipped,
 * which tell of them even once their screen has closed, and the record that a project was opened.
 */
export function screenCommands(action: AppAction, app: RouteApp) {
  return [
    ...failureNotices(action),
    ...skippedSourceSubtitles(action),
    ...markOpenedBy(app, action),
  ];
}
