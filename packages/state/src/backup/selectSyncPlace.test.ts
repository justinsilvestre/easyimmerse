import type { SyncLink } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppState } from "../app/appState.ts";
import { initialAppState } from "../app/update.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../server/serverCacheWith.ts";
import type { ServerConfig } from "../server/serverState.ts";
import { selectSyncPlace } from "./selectSyncPlace.ts";

const lanServer: ServerConfig = {
  serverUrl: "http://192.168.1.20:4000",
  token: "t",
};

const builtIn = (bundledIn: "desktop" | "mobile"): ServerConfig => ({
  serverUrl: "http://127.0.0.1:4000",
  token: "launch",
  bundledIn,
});

const cloudUrl = "https://cloud.example.org";

const link = {
  kind: "account",
  server_url: cloudUrl,
  account_email: "someone@example.org",
  account_role: "library_user",
  linked_at_ms: 0,
  last_synced_at_ms: 5000,
  pushed_through_seq: 0,
  state: { kind: "idle" },
  transfer: null,
  refused_upload: null,
  conflicts: [],
  conflict_count: 0,
} satisfies SyncLink;

const appWith = (config: ServerConfig | null): AppState => ({
  ...initialAppState,
  server: { config, cloudUrl },
});

const statusOf = (syncLink: SyncLink | null) =>
  serverCacheWith("getSyncStatus", undefined, {
    link: syncLink,
    pulled_revision: 0,
    local_change_seq: 0,
  });

const asLaunchHolder = (accounts: boolean) =>
  serverCacheWith(
    "getCurrentPrincipal",
    "self",
    { kind: "launch" },
    serverCacheWith("getServerAuthInfo", "self", {
      accounts,
      open_signup: false,
      sends_email: false,
    }),
  );

const placeOf = (
  config: ServerConfig | null,
  backend: ServerCacheSlice = emptyServerCache,
) => selectSyncPlace({ app: appWith(config), backend });

describe("selectSyncPlace", () => {
  it("places the work in this browser while the app runs without a server", () => {
    expect(placeOf(null)).toEqual({ kind: "thisDevice", device: "browser" });
  });

  it("places the work on this computer while the desktop app is linked to no remote", () => {
    expect(placeOf(builtIn("desktop"), statusOf(null))).toEqual({
      kind: "thisDevice",
      device: "computer",
    });
  });

  it("places the work on this device while the mobile app has not reported its link", () => {
    expect(placeOf(builtIn("mobile"))).toEqual({
      kind: "thisDevice",
      device: "mobile",
    });
  });

  it("places the work on the remote the built-in server is linked to, with its last backup", () => {
    expect(placeOf(builtIn("desktop"), statusOf(link))).toEqual({
      kind: "server",
      serverName: "the easyImmerse cloud",
      lastBackedUpMs: 5000,
    });
  });

  it("places the work on the server the app is logged in to", () => {
    expect(placeOf({ serverUrl: cloudUrl, token: "t" })).toEqual({
      kind: "server",
      serverName: "the easyImmerse cloud",
      lastBackedUpMs: null,
    });
  });

  it("tells of a pairing with a desktop app while the token is its launch token", () => {
    expect(placeOf(lanServer, asLaunchHolder(false))).toEqual({
      kind: "pairedDesktop",
      serverUrl: "http://192.168.1.20:4000",
      host: "192.168.1.20:4000",
      usesAccounts: false,
    });
  });

  it("tells whether the paired desktop app's server uses accounts", () => {
    expect(placeOf(lanServer, asLaunchHolder(true))).toMatchObject({
      usesAccounts: true,
    });
  });
});
