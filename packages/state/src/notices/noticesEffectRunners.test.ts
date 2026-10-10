import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import type { EffectContext } from "../app/runEffect.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { noticesEffectRunners } from "./noticesEffectRunners.ts";
import { selectNotices } from "./noticesSelectors.ts";
import { transientNotice } from "./transientNotice.ts";

/** Runs a notices effect against a fresh store that shows one notice with the key "k". */
function storeAfterRunning(run: (context: EffectContext) => void) {
  const store = createAppStore(
    createRecordingEffects(),
    createFakeServerStoreParts(),
  );
  store.dispatch(
    actions.noticeRequested({ ...transientNotice("info", "Kept"), key: "k" }),
  );
  run({ dispatch: store.dispatch } as EffectContext);
  return selectNotices(store.getState()).map((notice) => notice.message);
}

describe("noticesEffectRunners", () => {
  it("shows the notice a showNotice effect asks for", () => {
    const messages = storeAfterRunning((context) =>
      noticesEffectRunners.showNotice(
        { type: "showNotice", content: transientNotice("info", "Shown") },
        context,
      ),
    );
    expect(messages).toEqual(["Kept", "Shown"]);
  });

  it("withdraws the notice of the key a withdrawNotice effect names", () => {
    const messages = storeAfterRunning((context) =>
      noticesEffectRunners.withdrawNotice(
        { type: "withdrawNotice", key: "k" },
        context,
      ),
    );
    expect(messages).toEqual([]);
  });
});
