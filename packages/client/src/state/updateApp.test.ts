import { describe, expect, it } from "vitest";
import { createInitialAppState } from "./AppState.ts";
import { appActions } from "./appActions.ts";
import { effects } from "./effects.ts";
import { updateApp } from "./updateApp.ts";

const initialState = createInitialAppState("web");

describe("updateApp", () => {
  describe("when the app has started", () => {
    it("requests the address of the server", () => {
      const [, requestedEffects] = updateApp(
        initialState,
        appActions.appStarted(),
      );
      expect(requestedEffects).toEqual([effects.resolveServerUrl()]);
    });
  });

  describe("when a screen has been opened", () => {
    it("shows the screen", () => {
      const action = appActions.screenOpened("systemStatus");
      const [state] = updateApp(initialState, action);
      expect(state.screen).toBe("systemStatus");
    });
  });

  describe("when the address of the server has been resolved", () => {
    it("stores the address", () => {
      const action = appActions.serverUrlResolved("http://localhost:4100");
      const [state] = updateApp(initialState, action);
      expect(state.serverUrl).toBe("http://localhost:4100");
    });
  });

  describe("when given an action of an unknown type", () => {
    it("requests no effects", () => {
      const action = { type: "unknown" } as never;
      expect(updateApp(initialState, action)).toEqual([initialState, []]);
    });
  });
});
