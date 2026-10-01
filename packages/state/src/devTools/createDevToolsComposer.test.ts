import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import type { EnhancerComposer } from "../createAppStore.ts";
import type { DevToolsOptions } from "./createDevToolsComposer.ts";
import { createDevToolsComposer } from "./createDevToolsComposer.ts";

/** Configures a composer with a stand-in for the extension's compose function and returns the options it received. */
function captureOptions(): DevToolsOptions {
  let captured: DevToolsOptions | null = null;
  createDevToolsComposer((options) => {
    captured = options;
    return (...enhancers) => enhancers[0] ?? ((next) => next);
  });
  if (captured === null) throw new Error("The extension was not configured.");
  return captured;
}

describe("createDevToolsComposer", () => {
  it("returns the composer the extension builds", () => {
    const composer: EnhancerComposer = () => (next) => next;
    expect(createDevToolsComposer(() => composer)).toBe(composer);
  });

  it("configures the extension to replace bytes in actions", () => {
    const { actionSanitizer } = captureOptions();
    const action = actions.chosenFileBytesRead("k1", new Uint8Array(4));
    expect(actionSanitizer(action)).toEqual({
      type: "chosenFileBytesRead",
      key: "k1",
      bytes: "<Uint8Array 4 bytes>",
    });
  });

  it("configures the extension to replace bytes in the state", () => {
    const { stateSanitizer } = captureOptions();
    const state = { app: { bytes: new Uint8Array(4) } };
    expect(stateSanitizer(state)).toEqual({
      app: { bytes: "<Uint8Array 4 bytes>" },
    });
  });
});
