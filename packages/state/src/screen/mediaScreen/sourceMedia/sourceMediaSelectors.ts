import type { PluginForm } from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { AppState } from "../../../app/appState.ts";
import type { RootState } from "../../../app/createAppStore.ts";
import { selectIsRequestInFlight } from "../../../operations/operationsSelectors.ts";
import { mainScreenOf } from "../../../route/route.ts";
import { sourceMediaIds } from "./sourceMediaRequests.ts";

/** What the source dialog shows. */
export type SourceMediaView = {
  form: PluginForm | null;
  error: string | null;
  /** True while a step of the media file is in flight, sent from this opening of the dialog or an earlier one. */
  isBusy: boolean;
};

/**
 * Selects the dialog of the plugin the open media file was imported through, or null while it is closed.
 * The result keeps its reference while the dialog and whether a step is in flight do.
 */
export const selectSourceMedia = createSelector(
  [
    (state: RootState) =>
      state.app.screen.main.kind === "media"
        ? state.app.screen.main.sourceMedia
        : null,
    (state: RootState) => {
      const main = mainScreenOf(state.app.route);
      return (
        main.screen === "media" &&
        selectIsSourceStepInFlight(state.app, main.mediaFileId)
      );
    },
  ],
  (wizard, isBusy): SourceMediaView | null =>
    wizard === null ? null : { form: wizard.form, error: wizard.error, isBusy },
);

/** Tells whether a step of the media file's source dialog is in flight, sent from any opening of the dialog. */
export function selectIsSourceStepInFlight(
  app: Pick<AppState, "operations">,
  mediaFileId: string,
): boolean {
  return selectIsRequestInFlight(app, sourceMediaIds(mediaFileId).step);
}
