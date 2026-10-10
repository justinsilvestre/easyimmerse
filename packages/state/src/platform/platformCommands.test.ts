import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { platformCommands } from "./platformCommands.ts";

describe("platformCommands", () => {
  it("returns an openExternalUrl effect for externalLinkRequested", () => {
    expect(
      platformCommands(actions.externalLinkRequested("https://example.com")),
    ).toEqual([{ type: "openExternalUrl", url: "https://example.com" }]);
  });

  it("returns a copyText effect for textCopyRequested", () => {
    expect(platformCommands(actions.textCopyRequested("hello", "log"))).toEqual(
      [{ type: "copyText", text: "hello", what: "log" }],
    );
  });
});
