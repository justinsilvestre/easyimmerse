import type { RootState } from "../app/createAppStore.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import { hostOf } from "../server/hostOf.ts";
import { serverNameOf } from "../server/serverNameOf.ts";
import type { ServerConfig } from "../server/serverState.ts";
import { selectSyncStatus } from "../sync/syncSelectors.ts";

/** Where the person's work is kept, as the Sync button shows it. */
export type SyncPlace =
  /** Only on this device: in this browser, or on the native app's built-in server. */
  | { kind: "thisDevice"; device: "browser" | "computer" | "mobile" }
  /** On a server the app is logged in to, itself or through its built-in server, which last backed the work up at `lastBackedUpMs` if it says. */
  | { kind: "server"; serverName: string; lastBackedUpMs: number | null }
  /** On a desktop app this app is paired with over the local network, whose server is at `serverUrl`, or `host` as the copy names it, on the computer named `deviceName` if the server says. */
  | {
      kind: "pairedDesktop";
      serverUrl: string;
      host: string;
      deviceName: string | null;
      usesAccounts: boolean;
    };

/**
 * Returns where the person's work is kept.
 * An app connected to a server over the network is paired with a desktop app while its token is that server's launch token,
 * and logged in to the server otherwise, which it is also taken to be until the server has said who the token belongs to.
 * A built-in server counts as linked to no remote until it has reported its status.
 */
export function selectSyncPlace(root: RootState): SyncPlace {
  const { config, cloudUrl } = root.app.server;
  if (config === null) return { kind: "thisDevice", device: "browser" };
  if (config.bundledIn !== undefined) return builtInPlace(root, config);
  if (isLaunchHolder(root))
    return {
      kind: "pairedDesktop",
      serverUrl: config.serverUrl,
      host: hostOf(config.serverUrl),
      deviceName: pairedDeviceName(root),
      usesAccounts: usesAccounts(root),
    };
  return {
    kind: "server",
    serverName: serverNameOf(config.serverUrl, cloudUrl),
    lastBackedUpMs: null,
  };
}

function builtInPlace(root: RootState, config: ServerConfig): SyncPlace {
  const link = selectSyncStatus(root)?.link ?? null;
  if (link === null)
    return {
      kind: "thisDevice",
      device: config.bundledIn === "mobile" ? "mobile" : "computer",
    };
  return {
    kind: "server",
    serverName: serverNameOf(link.server_url, root.app.server.cloudUrl),
    lastBackedUpMs: link.last_synced_at_ms,
  };
}

function isLaunchHolder({ backend }: RootState): boolean {
  const principal = cacheEntry(backend, "getCurrentPrincipal", "self")?.data;
  return principal?.kind === "launch";
}

function usesAccounts({ backend }: RootState): boolean {
  return serverAuthInfo(backend)?.accounts ?? false;
}

function pairedDeviceName({ backend }: RootState): string | null {
  const name = serverAuthInfo(backend)?.device_name?.trim();
  return name ? name : null;
}

function serverAuthInfo(backend: RootState["backend"]) {
  return cacheEntry(backend, "getServerAuthInfo", "self")?.data;
}
