import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { selectNotices } from "../notices/noticesSelectors.ts";
import { createRecordingEffects } from "./recordingEffects.ts";

/** Asks a fresh store to copy the log and returns the store, whose effects refuse the copy when `isRefused`. */
function copyLog(isRefused: boolean) {
  const effects = createRecordingEffects();
  if (isRefused) effects.refuseCopies();
  const store = createAppStore(effects, createFakeServerStoreParts());
  store.dispatch(actions.textCopyRequested("[info] resolving", "log"));
  return store;
}

const messagesOf = (store: ReturnType<typeof copyLog>) =>
  selectNotices(store.getState()).map((notice) => notice.message);

describe("platformEffectRunners", () => {
  describe("for copyText", () => {
    it("reports the copy once the platform has made it", async () => {
      const store = copyLog(false);
      await vi.waitFor(() =>
        expect(messagesOf(store)).toEqual(["Copied the log."]),
      );
    });

    it("reports the failure once the platform has refused", async () => {
      const store = copyLog(true);
      await vi.waitFor(() =>
        expect(messagesOf(store)).toEqual(["The log could not be copied."]),
      );
    });
  });
});
