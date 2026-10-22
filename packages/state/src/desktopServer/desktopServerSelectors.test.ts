import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { lanSettings, runningOnLan, stopped } from "./desktopServerFixtures.ts";
import {
  selectDesktopPairingServer,
  selectDesktopServerSettingsForm,
  selectDesktopServerStatus,
  selectIsDesktopServerUnauthenticatedOnLan,
} from "./desktopServerSelectors.ts";

const loopbackRunning = {
  ...runningOnLan,
  urls: ["http://127.0.0.1:8787"],
  lan_reachable: false,
  pairing_url: null,
};

const accounts = { ...lanSettings, auth: "accounts" } as const;

describe("selectDesktopServerStatus", () => {
  it("shows the state as unknown until a status arrives", () => {
    const state = { app: stateAfter() };
    expect(selectDesktopServerStatus(state).state).toBe("unknown");
  });

  it("lets a stopped server start", () => {
    const state = {
      app: stateAfter(actions.desktopServerStatusReceived(stopped)),
    };
    expect(selectDesktopServerStatus(state).canStart).toBe(true);
  });

  it("keeps a server from starting twice while its start waits", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived(stopped),
        actions.desktopServerStartRequested(),
      ),
    };
    expect(selectDesktopServerStatus(state).canStart).toBe(false);
  });

  it("shows why the server failed", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived({
          ...stopped,
          state: { kind: "failed", message: "address already in use" },
        }),
      ),
    };
    expect(selectDesktopServerStatus(state).failure).toBe(
      "address already in use",
    );
  });

  it("shows why a start was refused", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStartRequested(),
        actions.desktopServerRequestFailed("start", "permission denied"),
      ),
    };
    expect(selectDesktopServerStatus(state).failure).toBe("permission denied");
  });
});

describe("selectDesktopServerSettingsForm", () => {
  it("waits for the settings", () => {
    const state = { app: stateAfter() };
    expect(selectDesktopServerSettingsForm(state).status).toBe("loading");
  });

  it("explains a bind address it cannot read", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerSettingsLoaded(lanSettings),
        actions.desktopServerSettingsChanged({ bind: "0.0.0.0" }),
      ),
    };
    expect(selectDesktopServerSettingsForm(state)).toMatchObject({
      bindProblem: "Enter an IP address and a port, such as 0.0.0.0:8787.",
      canSave: false,
    });
  });

  it("lets changes be saved", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerSettingsLoaded(lanSettings),
        actions.desktopServerSettingsChanged({ bind: "0.0.0.0:9000" }),
      ),
    };
    expect(selectDesktopServerSettingsForm(state)).toMatchObject({
      canSave: true,
    });
  });

  it("says that saving restarts the running server", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived(runningOnLan),
        actions.desktopServerSettingsLoaded(lanSettings),
        actions.desktopServerSettingsChanged({ api_only: true }),
      ),
    };
    expect(selectDesktopServerSettingsForm(state)).toMatchObject({
      restartsServer: true,
    });
  });

  it("knows that starting with the app changes nothing while the server runs", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived(runningOnLan),
        actions.desktopServerSettingsLoaded(lanSettings),
        actions.desktopServerSettingsChanged({ autostart: true }),
      ),
    };
    expect(selectDesktopServerSettingsForm(state)).toMatchObject({
      restartsServer: false,
    });
  });
});

describe("selectIsDesktopServerUnauthenticatedOnLan", () => {
  it("returns true for a server on the local network with the launch token", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived(runningOnLan),
        actions.desktopServerSettingsLoaded(lanSettings),
      ),
    };
    expect(selectIsDesktopServerUnauthenticatedOnLan(state)).toBe(true);
  });

  it("returns false for a server with accounts", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived(runningOnLan),
        actions.desktopServerSettingsLoaded(accounts),
      ),
    };
    expect(selectIsDesktopServerUnauthenticatedOnLan(state)).toBe(false);
  });

  it("returns false for a server only this computer reaches", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived(loopbackRunning),
        actions.desktopServerSettingsLoaded(lanSettings),
      ),
    };
    expect(selectIsDesktopServerUnauthenticatedOnLan(state)).toBe(false);
  });
});

describe("selectDesktopPairingServer", () => {
  it("returns null until a status arrives", () => {
    const state = { app: stateAfter() };
    expect(selectDesktopPairingServer(state)).toBeNull();
  });

  it("returns a stopped server", () => {
    const state = {
      app: stateAfter(actions.desktopServerStatusReceived(stopped)),
    };
    expect(selectDesktopPairingServer(state)).toEqual({ kind: "stopped" });
  });

  it("says why the status could not be read", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerRequestFailed("readStatus", "no shell"),
      ),
    };
    expect(selectDesktopPairingServer(state)).toEqual({
      kind: "unavailable",
      message: "no shell",
    });
  });

  it("says why the settings of a running server could not be read", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived(runningOnLan),
        actions.desktopServerRequestFailed("readSettings", "unreadable file"),
      ),
    };
    expect(selectDesktopPairingServer(state)).toEqual({
      kind: "unavailable",
      message: "unreadable file",
    });
  });

  it("returns a server only this computer reaches as loopback only", () => {
    const state = {
      app: stateAfter(actions.desktopServerStatusReceived(loopbackRunning)),
    };
    expect(selectDesktopPairingServer(state)).toEqual({ kind: "loopbackOnly" });
  });

  it("returns the pairing address and whether the server has accounts", () => {
    const state = {
      app: stateAfter(
        actions.desktopServerStatusReceived(runningOnLan),
        actions.desktopServerSettingsLoaded(accounts),
      ),
    };
    expect(selectDesktopPairingServer(state)).toEqual({
      kind: "running",
      url: "http://192.168.1.5:8787",
      hasAccounts: true,
    });
  });
});
