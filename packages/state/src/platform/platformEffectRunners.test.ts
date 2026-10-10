import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { selectNotices } from "../notices/noticesSelectors.ts";
import {
  createRecordingEffects,
  type RecordingEffects,
} from "./recordingEffects.ts";

/** Builds a fresh store over the effects and asks it to copy the log. */
function copyLogOver(effects: RecordingEffects) {
  const store = createAppStore(effects, createFakeServerStoreParts());
  store.dispatch(actions.textCopyRequested("[info] resolving", "log"));
  return store;
}

const copyLog = () => copyLogOver(createRecordingEffects());

function refuseThenCopyLog() {
  const effects = createRecordingEffects();
  effects.refuseCopies();
  return copyLogOver(effects);
}

const messagesOf = (store: ReturnType<typeof copyLog>) =>
  selectNotices(store.getState()).map((notice) => notice.message);

describe("platformEffectRunners", () => {
  describe("for copyText", () => {
    it("reports the copy once the platform has made it", async () => {
      const store = copyLog();
      await vi.waitFor(() =>
        expect(messagesOf(store)).toEqual(["Copied the log."]),
      );
    });

    it("reports the failure once the platform has refused", async () => {
      const store = refuseThenCopyLog();
      await vi.waitFor(() =>
        expect(messagesOf(store)).toEqual(["The log could not be copied."]),
      );
    });
  });
});
