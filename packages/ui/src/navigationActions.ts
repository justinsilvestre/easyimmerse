import {
  type AppAction,
  actions,
  type RootState,
  selectCurrentMediaFileId,
} from "@easyimmerse/state";
import type { NavigationAction } from "./navigation.ts";
import type { NavigationActions } from "./navigationContext.ts";

/** The navigation steps any screen may take, carried out through the app root's `dispatchNavigation` and the app's store. */
export function createNavigationActions(
  dispatchNavigation: (action: NavigationAction) => void,
  store: {
    dispatch: (action: AppAction) => unknown;
    getState: () => RootState;
  },
): NavigationActions {
  return {
    openSettings: () => dispatchNavigation({ type: "openSettings" }),
    openDictionaries: () => dispatchNavigation({ type: "openDictionaries" }),
    openMediaFile: (projectId, mediaFileId) => {
      dispatchNavigation({ type: "openProject", projectId });
      const openMediaFileId = selectCurrentMediaFileId(store.getState());
      // Closing the media file open now resets the player, as leaving its screen with Back does.
      if (openMediaFileId !== null && openMediaFileId !== mediaFileId)
        store.dispatch(actions.closeMedia());
      store.dispatch(actions.openMedia(mediaFileId));
    },
  };
}
