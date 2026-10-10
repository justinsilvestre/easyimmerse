import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { platformCommands } from "./platformCommands.ts";

describe("platformCommands", () => {
  it("returns a showNotification effect for notificationRequested", () => {
    expect(platformCommands(actions.notificationRequested("Saved"))).toEqual([
      { type: "showNotification", message: "Saved" },
    ]);
  });

  it("returns an openExternalUrl effect for externalLinkRequested", () => {
    expect(
      platformCommands(actions.externalLinkRequested("https://example.com")),
    ).toEqual([{ type: "openExternalUrl", url: "https://example.com" }]);
  });
});
