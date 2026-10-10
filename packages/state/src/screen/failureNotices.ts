import { type AppAction, actions } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { isAborted } from "../server/isAborted.ts";

/** Returns the notice that tells the user a change they asked for failed, even when its screen has gone by the time the failure arrives. */
export function failureNotices(action: AppAction) {
  if (
    action.type !== "requestSettled" ||
    action.outcome.ok ||
    isAborted(action.outcome)
  )
    return [];
  switch (action.request.kind) {
    case "addMediaFile":
      return [failure("The media file could not be added")];
    case "addSubtitleTrack":
      return [failure("The subtitles file could not be added")];
    case "saveTrackSelection":
      return [failure("The track choice could not be saved")];
    case "deleteDictionary":
      return [failure("The dictionary could not be removed")];
    case "createProject":
      return [failure("The project could not be created")];
    case "updateProject":
      return [failure("The settings could not be saved")];
    case "removeMediaFile":
      return [failure("The media file could not be removed")];
    case "setSubtitleSelection":
      return [failure("The subtitles could not be changed")];
    default:
      return [];
  }
}

function failure(message: string) {
  return dispatch(actions.noticeRequested(transientNotice("danger", message)));
}
