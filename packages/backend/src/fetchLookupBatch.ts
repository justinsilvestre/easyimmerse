import type {
  BatchLookupRequest,
  BatchLookupResponse,
  LookupQuery,
} from "@easyimmerse/types";
import type { UnknownAction } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import { backendApi, type selectRunningBatches } from "./backendApi.ts";
import type { BackendError } from "./backendClient.ts";
import { rememberFailure } from "./failedPassages.ts";
import type { Passage } from "./lookupBatches.ts";
import { lookupResponseAt } from "./lookupResponseAt.ts";

type BackendState = Parameters<typeof selectRunningBatches>[0];
export type BackendThunkDispatch = ThunkDispatch<
  BackendState,
  unknown,
  UnknownAction
>;

/**
 * Fetches one batch of passages of one language, then caches the lookups given for positions in them.
 * When the server rejects the batch, its halves are fetched apart, so that one text it cannot take does not cost the others;
 * passages whose batch fails otherwise, or that are rejected on their own, are remembered as failed.
 */
export async function fetchLookupBatch(
  dispatch: BackendThunkDispatch,
  passages: readonly Passage[],
  lookups: readonly LookupQuery[],
): Promise<void> {
  const request = requestOf(passages);
  const outcome = await dispatch(
    backendApi.endpoints.lookupTexts.initiate(request, { subscribe: false }),
  )
    .unwrap()
    .then(
      (answer) => ({ answer }),
      (error: BackendError) => ({ error }),
    );
  if ("answer" in outcome)
    return cacheAnswer(dispatch, request, outcome.answer, lookups);
  if (outcome.error.status !== 400 || passages.length === 1)
    return rememberFailure(dispatch, passages);
  await Promise.all(
    halvesOf(passages).map((half) => fetchLookupBatch(dispatch, half, lookups)),
  );
}

function requestOf(passages: readonly Passage[]): BatchLookupRequest {
  return {
    language: passages[0]?.language ?? "",
    texts: passages.map((passage) => passage.text),
  };
}

/** Caches the response at each position of the lookups that lie in the batch's texts. */
function cacheAnswer(
  dispatch: BackendThunkDispatch,
  request: BatchLookupRequest,
  answer: BatchLookupResponse,
  lookups: readonly LookupQuery[],
) {
  const indexes = new Map(request.texts.map((text, index) => [text, index]));
  const entries = lookups.flatMap((lookup) => {
    const index =
      lookup.language === request.language && lookup.context !== undefined
        ? indexes.get(lookup.context)
        : undefined;
    const value =
      index === undefined
        ? null
        : lookupResponseAt(request, answer, index, lookup.offset ?? 0);
    return value
      ? [{ endpointName: "lookupText" as const, arg: lookup, value }]
      : [];
  });
  dispatch(backendApi.util.upsertQueryEntries(entries));
}

function halvesOf<T>(items: readonly T[]): T[][] {
  const middle = Math.ceil(items.length / 2);
  return [items.slice(0, middle), items.slice(middle)];
}
