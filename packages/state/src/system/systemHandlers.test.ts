import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import { initialAppState } from "../appState.ts";
import { update } from "../update.ts";

describe("update", () => {
  it("returns a showNotification effect for notificationRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.notificationRequested("Saved"),
    );
    expect(effects).toEqual([{ type: "showNotification", message: "Saved" }]);
  });

  it("copies the text and then confirms for cueCopyRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.cueCopyRequested("Hello"),
    );
    expect(effects).toEqual([
      { type: "copyToClipboard", text: "Hello" },
      { type: "showNotification", message: "Copied to clipboard" },
    ]);
  });

  it("returns an openExternalUrl effect for externalLinkRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.externalLinkRequested("https://example.com"),
    );
    expect(effects).toEqual([
      { type: "openExternalUrl", url: "https://example.com" },
    ]);
  });
});
