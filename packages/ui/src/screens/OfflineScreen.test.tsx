import { resetBackend } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { OfflineScreen } from "./OfflineScreen.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

describe("OfflineScreen", () => {
  it("lists the cues of a picked subtitles file", async () => {
    const { effects, store } = renderWithAppStore(
      <OfflineScreen onBack={() => undefined} />,
    );
    act(() => store.dispatch(actions.navigated({ type: "continueOffline" })));
    fireEvent.click(
      screen.getByRole("button", { name: "Open a subtitles file" }),
    );
    act(() =>
      effects.resolvePickFile({
        name: "sample.srt",
        source: { kind: "inline", text: "unused by the fake backend" },
      }),
    );
    expect(await screen.findByRole("button", { name: "night" })).toBeDefined();
  });
});
