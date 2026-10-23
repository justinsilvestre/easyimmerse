import { parseServerConfig } from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";
import { serverConfigStorageKey } from "@easyimmerse/state";

/** The part of an extension storage area, such as `browser.storage.local`, that the mirror uses. */
export type MirrorStorageArea = {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
};

/**
 * Copies the server the side panel connects to into extension storage, or removes the copy when there is none,
 * so that the background script, which has no local storage, can reach the same server.
 */
export function mirrorServerConfig(
  area: MirrorStorageArea,
  server: ServerConfig | null,
): Promise<void> {
  if (server === null) return area.remove(serverConfigStorageKey);
  return area.set({ [serverConfigStorageKey]: server });
}

/** Reads the server that `mirrorServerConfig` copied, or null when there is none. */
export async function readMirroredServerConfig(
  area: MirrorStorageArea,
): Promise<ServerConfig | null> {
  const items = await area.get(serverConfigStorageKey);
  return parseServerConfig(items[serverConfigStorageKey]);
}
