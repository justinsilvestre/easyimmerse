import type { ServerConfig } from "@easyimmerse/state";
import { isPersonBoundPreferenceKey } from "@easyimmerse/state";
import type { PreferenceStore } from "./preferenceStore.ts";
import { createServerPreferenceStore } from "./serverPreferenceStore.ts";

/**
 * Keeps the preferences that follow the person on the connected server, so that every device the person uses sees them,
 * and keeps the other preferences in the given device store. With no server, every preference stays on the device.
 */
export function createScopedPreferenceStore(
  server: ServerConfig | null,
  deviceStore: PreferenceStore,
  fetchFn: typeof fetch = globalThis.fetch,
): PreferenceStore {
  if (server === null) return deviceStore;
  const serverStore = createServerPreferenceStore(server, fetchFn);
  const storeFor = (key: string) =>
    isPersonBoundPreferenceKey(key) ? serverStore : deviceStore;
  return {
    save: (key, value) => storeFor(key).save(key, value),
    load: (key) => storeFor(key).load(key),
  };
}
