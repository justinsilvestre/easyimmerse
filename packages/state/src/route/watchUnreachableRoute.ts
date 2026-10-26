import { actions } from "../app/appAction.ts";
import type { AppStore } from "../app/createAppStore.ts";
import { selectIsRouteUnreachable } from "./selectIsRouteUnreachable.ts";

/**
 * Moves to the home screen whenever the screen a link opened turns out to be unreachable, for as long as the store lives.
 * It watches the store rather than its actions, since the server's answers that settle it pass the app's update by.
 */
export function watchUnreachableRoute(store: AppStore): void {
  store.subscribe(() => {
    if (selectIsRouteUnreachable(store.getState()))
      store.dispatch(actions.routeUnreachable());
  });
}
