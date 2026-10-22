import { describe, expect, it } from "vitest";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import {
  selectAccountVia,
  selectServerConfig,
  selectWorkHome,
} from "./serverSelectors.ts";
import type { ServerConfig } from "./serverState.ts";

const server = { serverUrl: "http://localhost:4000", token: "test-token" };
const builtInServer = { ...server, bundledIn: "desktop" } as const;

function stateWith(config?: ServerConfig) {
  return createAppStore(
    createRecordingEffects(),
    createFakeServerStoreParts(config),
  ).getState();
}

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

describe("selectWorkHome", () => {
  it("returns browser when the app runs without a server", () => {
    expect(selectWorkHome(stateWith())).toBe("browser");
  });

  it("returns accountServer when the app is connected to a server over the network", () => {
    expect(selectWorkHome(stateWith(server))).toBe("accountServer");
  });

  it("returns builtInServer when the native app runs the server inside itself", () => {
    expect(selectWorkHome(stateWith(builtInServer))).toBe("builtInServer");
  });
});

describe("selectAccountVia", () => {
  it("returns self when the app is connected to a server over the network", () => {
    expect(selectAccountVia(stateWith(server))).toBe("self");
  });

  it("returns self when the app runs without a server", () => {
    expect(selectAccountVia(stateWith())).toBe("self");
  });

  it("returns linkedRemote when the native app runs the server inside itself", () => {
    expect(selectAccountVia(stateWith(builtInServer))).toBe("linkedRemote");
  });
});
