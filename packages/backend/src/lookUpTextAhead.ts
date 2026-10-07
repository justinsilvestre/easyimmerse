import type { AppDispatch } from "@easyimmerse/state";
import type { LookupQuery, LookupResponse } from "@easyimmerse/types";
import type { UnknownAction } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import { backendApi } from "./backendApi.ts";

/**
 * Looks text up through the shared cache, as `useLookupTextQuery` does, without tying the result to any component,
 * so that looking words up ahead of a click renders nothing again.
 * A lookup made or being made for the same query is reused, and the result stays cached for a later `useLookupTextQuery`.
 * The promise rejects when the lookup fails.
 */
export function lookUpTextAhead(
  dispatch: AppDispatch,
  query: LookupQuery,
): Promise<LookupResponse> {
  // The app store's dispatch is typed for app actions only; thunks reach it through the middleware chain.
  const thunkDispatch = dispatch as unknown as ThunkDispatch<
    unknown,
    unknown,
    UnknownAction
  >;
  return thunkDispatch(
    backendApi.endpoints.lookupText.initiate(query, { subscribe: false }),
  ).unwrap();
}
