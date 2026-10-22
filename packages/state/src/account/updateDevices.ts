import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { isAborted } from "../server/isAborted.ts";
import { type DevicesState, deleteSessionRequestId } from "./devices.ts";

/**
 * Logs the account out on one of its devices, and keeps why that failed.
 * Logging out this device disconnects the app afterwards, as logging out does, whether or not the server could be reached.
 * A device that is already logged out counts as logged out.
 */
export function updateDevices(
  devices: DevicesState,
  action: AppAction,
  { operations }: Pick<ReadableState, "operations">,
) {
  switch (action.type) {
    case "deviceLogOutRequested": {
      const id = deleteSessionRequestId(action.sessionId);
      if (selectIsRequestInFlight({ operations }, id)) return updated(devices);
      return updated(
        { logOutFailure: null },
        {
          type: "sendRequest",
          id,
          request: {
            kind: "deleteSession",
            sessionId: action.sessionId,
            isCurrent: action.isCurrent,
          },
        },
      );
    }
    case "requestSettled": {
      const { request, outcome } = action;
      if (request.kind !== "deleteSession") return updated(devices);
      if (request.isCurrent)
        return updated(devices, { type: "disconnectFromServer" });
      if (outcome.ok || isAborted(outcome) || outcome.error.status === 404)
        return updated(devices);
      return updated({ logOutFailure: outcome.error });
    }
    default:
      return updated(devices);
  }
}
