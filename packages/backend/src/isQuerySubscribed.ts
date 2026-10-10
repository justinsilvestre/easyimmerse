import type { BaseQueryApi } from "@reduxjs/toolkit/query";

/** The part of an RTK Query API's internal actions that reports its subscriptions. */
export type SubscriptionActions = {
  internal_getRTKQSubscriptions: () => { type: string };
};

/**
 * Whether any component still subscribes to the query being run.
 * RTK Query offers no public way to ask this. Dispatching its internal `internal_getRTKQSubscriptions` action
 * makes its middleware return the subscription selectors, so this is the one place to change if that internal goes.
 */
export function isQuerySubscribed(
  api: BaseQueryApi,
  internalActions: SubscriptionActions,
): boolean {
  const subscriptions = api.dispatch(
    internalActions.internal_getRTKQSubscriptions(),
  ) as unknown as { getSubscriptionCount: (queryCacheKey: string) => number };
  return subscriptions.getSubscriptionCount(api.queryCacheKey ?? "") > 0;
}
