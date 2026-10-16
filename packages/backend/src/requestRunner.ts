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

type StartedMutation = { unwrap(): Promise<unknown>; abort(): void };

type StartedQuery = StartedMutation & { unsubscribe(): void };

type StartedRequest = StartedMutation | StartedQuery;

type BackendDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

type StartRequest<K extends ServerRequestKind> = (
  request: RequestOf<K>,
) => ThunkAction<StartedRequest, unknown, unknown, UnknownAction>;

/**
 * Starts each kind of request through its endpoint, so that its cache tags and lifecycle apply as for any other caller.
 * Queries subscribe until they settle, so a tag invalidated meanwhile refetches the entry instead of removing it, and the entry then expires as any unused entry does.
 * Mutations are not tracked, so they leave no entry.
 * A job's status is always fetched anew, since the cached status is the one the poll wants to replace.
 */
export const requestEndpoints = {
  listSubtitleTracks: ({ projectId, mediaFileId }) =>
    backendApi.endpoints.listSubtitleTracks.initiate({
      projectId,
      mediaFileId,
    }),
  addSubtitleTrack: ({ projectId, mediaFileId, request }) =>
    backendApi.endpoints.addSubtitleTrack.initiate(
      { projectId, mediaFileId, request },
      { track: false },
    ),
  getProject: ({ projectId }) =>
    backendApi.endpoints.getProject.initiate(projectId),
  listMediaFiles: ({ projectId }) =>
    backendApi.endpoints.listMediaFiles.initiate(projectId),
  addMediaFile: ({ projectId, request }) =>
    backendApi.endpoints.addMediaFile.initiate(
      { projectId, request },
      { track: false },
    ),
  parseTimedText: ({ request }) =>
    backendApi.endpoints.parseTimedText.initiate(request, { track: false }),
  getImportJob: ({ jobId }) =>
    backendApi.endpoints.getImportJob.initiate(jobId, { forceRefetch: true }),
  getMediaSourceJob: ({ projectId, jobId }) =>
    backendApi.endpoints.getMediaSourceJob.initiate(
      { projectId, jobId },
      { forceRefetch: true },
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
  getSourceForm: ({ projectId, mediaFileId }) =>
    backendApi.endpoints.getSourceForm.initiate(
      { projectId, mediaFileId },
      { track: false },
    ),
  submitSourceStep: ({ projectId, mediaFileId, request }) =>
    backendApi.endpoints.submitSourceStep.initiate(
      { projectId, mediaFileId, request },
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
    backendApi.endpoints.getMediaTracks.initiate({ projectId, mediaFileId }),
  choosePlaybackMethod: ({ projectId, mediaFileId, request }) =>
    backendApi.endpoints.choosePlaybackMethod.initiate({
      projectId,
      mediaFileId,
      request,
    }),
  saveTrackSelection: ({ projectId, mediaFileId, selection }) =>
    backendApi.endpoints.saveTrackSelection.initiate(
      { projectId, mediaFileId, selection },
      { track: false },
    ),
  getWaveformWindow: ({ projectId, mediaFileId, startMs, endMs }) =>
    backendApi.endpoints.getWaveformWindow.initiate({
      projectId,
      mediaFileId,
      startMs,
      endMs,
    }),
  lookupText: ({ query }) => backendApi.endpoints.lookupText.initiate(query),
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
  removeMediaFile: ({ projectId, mediaFileId }) =>
    backendApi.endpoints.removeMediaFile.initiate(
      { projectId, mediaFileId },
      { track: false },
    ),
  setSubtitleSelection: ({ projectId, mediaFileId, selection }) =>
    backendApi.endpoints.setSubtitleSelection.initiate(
      { projectId, mediaFileId, selection },
      { track: false },
    ),
  updateProject: ({ projectId, settings }) =>
    backendApi.endpoints.updateProject.initiate(
      { projectId, settings },
      { track: false },
    ),
  saveFlashcard: ({ projectId, flashcardId, draft, isNew }) =>
    isNew
      ? backendApi.endpoints.createFlashcard.initiate(
          { projectId, flashcard: { id: flashcardId, draft } },
          { track: false },
        )
      : backendApi.endpoints.updateFlashcard.initiate(
          { projectId, flashcardId, draft },
          { track: false },
        ),
  deleteFlashcard: ({ projectId, flashcardId }) =>
    backendApi.endpoints.deleteFlashcard.initiate(
      { projectId, flashcardId },
      { track: false },
    ),
  probePictures: ({ file }) =>
    backendApi.endpoints.probePictures.initiate(file),
} satisfies { [K in ServerRequestKind]: StartRequest<K> };

/**
 * Sends a request through its endpoint in the store that `dispatch` belongs to, and reports its outcome.
 * Aborting a query that another caller started does not stop it, and the request then settles with its data.
 * A query that ends with neither data nor an error settles as a failure.
 */
export const runRequest: RequestRunner = (request, dispatch) => {
  const start = requestEndpoints[request.kind] as StartRequest<
    typeof request.kind
  >;
  const started = (dispatch as BackendDispatch)(start(request));
  const data = isQuery(started) ? queryData(started) : started.unwrap();
  const settled = data.then(
    (data): RequestOutcome => ({ ok: true, data }) as RequestOutcome,
    (error): RequestOutcome => ({ ok: false, error: toRequestFailure(error) }),
  );
  return { settled, abort: () => started.abort() } as RunningRequest<
    typeof request.kind
  >;
};

function isQuery(started: StartedRequest): started is StartedQuery {
  return "unsubscribe" in started;
}

/** Waits for a query's data, rejecting when it has none, and then ends its subscription. */
async function queryData(started: StartedQuery): Promise<unknown> {
  try {
    const data = await started.unwrap();
    if (data === undefined) throw new Error("The request ended without data.");
    return data;
  } finally {
    started.unsubscribe();
  }
}
