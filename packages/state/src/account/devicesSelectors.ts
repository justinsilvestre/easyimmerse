import type { AppRoot } from "../app/createAppStore.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { deleteSessionRequestId } from "./devices.ts";

/** Tells whether the app is logging the account out on the device of the session. */
export const selectIsLoggingOutDevice = (state: AppRoot, sessionId: string) =>
  selectIsRequestInFlight(state.app, deleteSessionRequestId(sessionId));

/** Returns why logging out another device failed last, or null. */
export function selectDeviceLogOutFailureMessage(
  state: AppRoot,
): string | null {
  const failure = state.app.account.devices.logOutFailure;
  if (failure === null) return null;
  if (failure.status === "NETWORK")
    return "Couldn't reach the server to log out that device. Check your connection and try again.";
  return `Couldn't log out that device: ${failure.message}`;
}
