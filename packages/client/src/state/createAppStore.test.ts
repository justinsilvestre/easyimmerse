import { describe, expect, it, vi } from "vitest";
import { appActions } from "./appActions.ts";
import { createAppStore } from "./createAppStore.ts";
import type { EffectsRunners } from "./effects.ts";

const serverUrl = "http://localhost:4100";

const runners: EffectsRunners = {
  resolveServerUrl: (_effect, dispatch) =>
    dispatch(appActions.serverUrlResolved(serverUrl)),
};

describe("app store", () => {
  describe("when an action requests an effect", () => {
    it("runs the effect with the runner for the platform", () => {
      const resolveServerUrl = vi.fn();
      const store = createAppStore("web", { resolveServerUrl });
      store.dispatch(appActions.appStarted());
      expect(resolveServerUrl).toHaveBeenCalledOnce();
    });

    it("updates the state with the actions dispatched by the runner", () => {
      const store = createAppStore("web", runners);
      store.dispatch(appActions.appStarted());
      expect(store.getState().app.serverUrl).toBe(serverUrl);
    });
  });

  describe("when an action requests no effects", () => {
    it("runs no effects", () => {
      const resolveServerUrl = vi.fn();
      const store = createAppStore("web", { resolveServerUrl });
      store.dispatch(appActions.screenOpened("systemStatus"));
      expect(resolveServerUrl).not.toHaveBeenCalled();
    });
  });
});
