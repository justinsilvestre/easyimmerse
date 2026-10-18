import type { AppAction } from "../app/appAction.ts";
import type { RequestSettled, ServerRequestKind } from "./serverRequest.ts";

/** Tells whether the action is the end of the request sent with this id and of this kind, so that its outcome holds that kind's data. */
export function isSettled<K extends ServerRequestKind>(
  action: AppAction,
  id: string,
  kind: K,
): action is Extract<RequestSettled, { request: { kind: K } }> {
  return (
    action.type === "requestSettled" &&
    action.id === id &&
    action.request.kind === kind
  );
}
