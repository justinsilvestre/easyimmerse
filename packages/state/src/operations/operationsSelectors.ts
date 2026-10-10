import type { OperationsState } from "./operations.ts";

/** Tells whether a request with this id has been sent and has not settled. */
export function isRequestInFlight(
  operations: OperationsState,
  id: string,
): boolean {
  return operations.requests.some((record) => record.id === id);
}
