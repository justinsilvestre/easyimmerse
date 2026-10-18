import type { AppState } from "../app/appState.ts";

/** Tells whether a request with this id has been sent and has not settled. */
export function selectIsRequestInFlight(
  app: Pick<AppState, "operations">,
  id: string,
): boolean {
  return app.operations.requests.some((record) => record.id === id);
}
