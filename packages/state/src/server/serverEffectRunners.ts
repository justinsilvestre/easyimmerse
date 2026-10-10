import type { EffectRunners } from "../app/runEffect.ts";
import { serverActions } from "./serverActions.ts";
import type { ServerEffect } from "./serverEffect.ts";
import type { ServerRequest } from "./serverRequest.ts";
import { abortedFailure } from "./serverRequest.ts";

/** Performs the server effects through the store's request table. */
export const serverEffectRunners = {
  sendRequest: ({ id, request }, { requests, dispatch }) =>
    requests.send(id, request, (outcome) =>
      dispatch(settledAction(id, request, outcome)),
    ),
  abortRequest: ({ id }, { requests }) => requests.abort(id),
  settleWithdrawnRequest: ({ id, request }, { dispatch }) =>
    dispatch(settledAction(id, request, { ok: false, error: abortedFailure })),
} satisfies EffectRunners<ServerEffect>;

// The table and the runner do not keep the link between a request's kind and its outcome's type, so it is restored here.
const settledAction = serverActions.requestSettled as (
  id: string,
  request: ServerRequest,
  outcome: unknown,
) => ReturnType<typeof serverActions.requestSettled>;
