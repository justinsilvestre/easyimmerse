import { listen } from "@tauri-apps/api/event";

/** The event the native shell emits when the Preferences menu item is chosen. */
export const openSettingsEvent = "open-settings";

type Listen = (event: string, handler: () => void) => Promise<() => void>;

/** Calls the listener whenever the native shell's Preferences menu item is chosen. */
export function subscribeToSettingsRequests(listener: () => void): () => void {
  return createSettingsRequestSubscription(listen)(listener);
}

/** Builds the subscription over the given Tauri `listen` function, so tests can supply a fake. */
export function createSettingsRequestSubscription(
  listenFn: Listen,
): (listener: () => void) => () => void {
  return (listener) => {
    const stopListening = listenFn(openSettingsEvent, listener);
    return () => {
      void stopListening.then((stop) => stop());
    };
  };
}
