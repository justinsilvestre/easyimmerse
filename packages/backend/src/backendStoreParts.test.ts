import type { RootState } from "@easyimmerse/state";
import { createAppStore, createRecordingEffects } from "@easyimmerse/state";
import type { UnknownAction } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import { afterEach, describe, expect, it } from "vitest";
import { backendApi } from "./backendApi.ts";
import type { BackendRequest } from "./backendClient.ts";
import { backendStoreParts } from "./backendStoreParts.ts";
import { configureBackend, resetBackend } from "./configureBackend.ts";

type ThunkCapableDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;

function createConfiguredStore() {
  configureBackend({
    send: async <T>(_request: BackendRequest) => ({
      data: { projects: [] } as T,
    }),
  });
  return createAppStore(createRecordingEffects(), backendStoreParts);
}

afterEach(resetBackend);

describe("backendStoreParts", () => {
  it("mounts the API reducer under the backend reducer path", () => {
    const store = createConfiguredStore();
    expect(store.getState()).toHaveProperty("backend");
  });

  it("lets the hand-built app store run RTK Query thunks", async () => {
    const store = createConfiguredStore();
    // The app store's dispatch is typed for app actions only; thunks reach it through the middleware chain.
    const dispatch = store.dispatch as unknown as ThunkCapableDispatch;
    const result = await dispatch(backendApi.endpoints.listProjects.initiate());
    expect(result.data).toEqual({ projects: [] });
  });
});
