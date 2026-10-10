import type {
  RequestOutcome,
  RequestRunner,
  RunningRequest,
  ServerRequest,
  ServerRequestKind,
} from "@easyimmerse/state";
import type {
  ThunkAction,
  ThunkDispatch,
  UnknownAction,
} from "@reduxjs/toolkit";
import { backendApi } from "./backendApi.ts";
import { toRequestFailure } from "./toRequestFailure.ts";

type RequestOf<K extends ServerRequestKind> = Extract<
  ServerRequest,
  { kind: K }
>;

type StartedRequest = { unwrap(): Promise<unknown>; abort(): void };

type BackendDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

type StartRequest<K extends ServerRequestKind> = (
  request: RequestOf<K>,
) => ThunkAction<StartedRequest, unknown, unknown, UnknownAction>;

/**
 * Starts each kind of request through its endpoint, so that its cache tags and lifecycle apply as for any other caller.
 * Queries do not subscribe, so their entry expires as any unused entry does; mutations are not tracked, so they leave no entry.
 */
export const requestEndpoints = {
  listSubtitleTracks: ({ projectId, mediaFileId }) =>
    backendApi.endpoints.listSubtitleTracks.initiate(
      { projectId, mediaFileId },
      { subscribe: false },
    ),
  addSubtitleTrack: ({ projectId, mediaFileId, request }) =>
    backendApi.endpoints.addSubtitleTrack.initiate(
      { projectId, mediaFileId, request },
      { track: false },
    ),
  listMediaFiles: ({ projectId }) =>
    backendApi.endpoints.listMediaFiles.initiate(projectId, {
      subscribe: false,
    }),
  addMediaFile: ({ projectId, request }) =>
    backendApi.endpoints.addMediaFile.initiate(
      { projectId, request },
      { track: false },
    ),
} satisfies { [K in ServerRequestKind]: StartRequest<K> };

/** Sends a request through its endpoint in the store that `dispatch` belongs to, and reports its outcome. */
export const runRequest: RequestRunner = (request, dispatch) => {
  const start = requestEndpoints[request.kind] as StartRequest<
    typeof request.kind
  >;
  const started = (dispatch as BackendDispatch)(start(request));
  const settled = started.unwrap().then(
    (data): RequestOutcome => ({ ok: true, data }) as RequestOutcome,
    (error): RequestOutcome => ({ ok: false, error: toRequestFailure(error) }),
  );
  return { settled, abort: () => started.abort() } as RunningRequest<
    typeof request.kind
  >;
};
