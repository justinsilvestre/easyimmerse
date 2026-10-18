import { describe, expect, it } from "vitest";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { selectServerConfig } from "./serverSelectors.ts";

const server = { serverUrl: "http://localhost:4000", token: "test-token" };

describe("selectServerConfig", () => {
  it("returns the server the store was created with", () => {
    const store = createAppStore(
      createRecordingEffects(),
      createFakeServerStoreParts(server),
    );
    expect(selectServerConfig(store.getState())).toEqual(server);
  });

  it("returns null when the store was created without a server", () => {
    const store = createAppStore(
      createRecordingEffects(),
      createFakeServerStoreParts(),
    );
    expect(selectServerConfig(store.getState())).toBeNull();
  });
});
