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
 * A job's status is always fetched anew, since the cached status is the one the poll wants to replace.
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
  parseTimedText: ({ request }) =>
    backendApi.endpoints.parseTimedText.initiate(request, { track: false }),
  getImportJob: ({ jobId }) =>
    backendApi.endpoints.getImportJob.initiate(jobId, {
      subscribe: false,
      forceRefetch: true,
    }),
  getMediaSourceJob: ({ projectId, jobId }) =>
    backendApi.endpoints.getMediaSourceJob.initiate(
      { projectId, jobId },
      { subscribe: false, forceRefetch: true },
    ),
  getImportForm: ({ projectId, request }) =>
    backendApi.endpoints.getImportForm.initiate(
      { projectId, request },
      { track: false },
    ),
  submitImportStep: ({ projectId, request }) =>
    backendApi.endpoints.submitImportStep.initiate(
      { projectId, request },
      { track: false },
    ),
  previewDictionaryTable: ({ file }) =>
    backendApi.endpoints.previewDictionaryTable.initiate(
      { file },
      { track: false },
    ),
  importDictionary: ({ file, tableLayout }) =>
    backendApi.endpoints.importDictionary.initiate(
      { file, tableLayout },
      { track: false },
    ),
  markProjectOpened: ({ projectId }) =>
    backendApi.endpoints.markProjectOpened.initiate(projectId, {
      track: false,
    }),
  getMediaTracks: ({ projectId, mediaFileId }) =>
    backendApi.endpoints.getMediaTracks.initiate(
      { projectId, mediaFileId },
      { subscribe: false },
    ),
  planPlayback: ({ projectId, mediaFileId, request }) =>
    backendApi.endpoints.planPlayback.initiate(
      { projectId, mediaFileId, request },
      { subscribe: false },
    ),
  saveTrackSelection: ({ projectId, mediaFileId, selection }) =>
    backendApi.endpoints.saveTrackSelection.initiate(
      { projectId, mediaFileId, selection },
      { track: false },
    ),
  getWaveformWindow: ({ projectId, mediaFileId, startMs, endMs }) =>
    backendApi.endpoints.getWaveformWindow.initiate(
      { projectId, mediaFileId, startMs, endMs },
      { subscribe: false },
    ),
  lookupText: ({ query }) =>
    backendApi.endpoints.lookupText.initiate(query, { subscribe: false }),
  deleteDictionary: ({ dictionaryId }) =>
    backendApi.endpoints.deleteDictionary.initiate(dictionaryId, {
      track: false,
    }),
  clearConversionCache: () =>
    backendApi.endpoints.clearConversionCache.initiate(undefined, {
      track: false,
    }),
  setConversionCacheBudget: ({ budget }) =>
    backendApi.endpoints.setConversionCacheBudget.initiate(budget, {
      track: false,
    }),
  createProject: ({ settings }) =>
    backendApi.endpoints.createProject.initiate(settings, { track: false }),
} satisfies { [K in ServerRequestKind]: StartRequest<K> };

/**
 * Sends a request through its endpoint in the store that `dispatch` belongs to, and reports its outcome.
 * Aborting a query that another caller started does not stop it, and the request then settles with its data.
 */
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
