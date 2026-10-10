import type { AppAction } from "../app/appAction.ts";
import { mainScreenMoveOf } from "../route/mainScreenMoveOf.ts";
import type { RouteApp } from "../route/updateRoute.ts";
import {
  type OpenMediaScreen,
  selectMediaScreen,
} from "./mediaScreen/mediaScreenSelectors.ts";

/** Returns the open media screen when the action's route change closes it, or null when it stays open or none is open. */
export function mediaScreenLeftBy(
  app: RouteApp,
  action: AppAction,
): OpenMediaScreen | null {
  const open = selectMediaScreen(app);
  return open && mainScreenMoveOf(app, action) !== null ? open : null;
}

/** Returns the media file whose media screen or reader the action's route change opens, or null when none opens. */
export function mediaScreenEnteredBy(
  app: RouteApp,
  action: AppAction,
): string | null {
  const to = mainScreenMoveOf(app, action)?.to;
  return to?.screen === "media" ? to.mediaFileId : null;
}
