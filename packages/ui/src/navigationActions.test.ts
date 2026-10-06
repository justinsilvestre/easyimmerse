import { type AppAction, actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import type { NavigationAction } from "./navigation.ts";
import { createNavigationActions } from "./navigationActions.ts";
import { createTestAppStore } from "./testSupport/createTestAppStore.ts";

/** Navigation actions over a fresh store with `mediaFileId` open, recording what they dispatch. */
function navigationWith(mediaFileId: string | null) {
  const { store } = createTestAppStore();
  if (mediaFileId !== null) store.dispatch(actions.openMedia(mediaFileId));
  const dispatched: AppAction["type"][] = [];
  const navigated: NavigationAction[] = [];
  const recordingStore = {
    getState: store.getState,
    dispatch: (action: AppAction) => {
      dispatched.push(action.type);
      return store.dispatch(action);
    },
  };
  const navigation = createNavigationActions(
    (action) => navigated.push(action),
    recordingStore,
  );
  return { navigation, dispatched, navigated };
}

describe("createNavigationActions", () => {
  describe("openMediaFile", () => {
    it("opens the media file's project", () => {
      const { navigation, navigated } = navigationWith(null);
      navigation.openMediaFile("p1", "m1");
      expect(navigated).toEqual([{ type: "openProject", projectId: "p1" }]);
    });

    it("opens the media file when none is open", () => {
      const { navigation, dispatched } = navigationWith(null);
      navigation.openMediaFile("p1", "m1");
      expect(dispatched).toEqual(["openMedia"]);
    });

    it("closes a different media file first", () => {
      const { navigation, dispatched } = navigationWith("m2");
      navigation.openMediaFile("p1", "m1");
      expect(dispatched).toEqual(["closeMedia", "openMedia"]);
    });

    it("leaves the same media file open", () => {
      const { navigation, dispatched } = navigationWith("m1");
      navigation.openMediaFile("p1", "m1");
      expect(dispatched).toEqual(["openMedia"]);
    });
  });
});
