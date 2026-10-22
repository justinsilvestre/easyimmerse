import type {
  RequestOutcome,
  RequestRunner,
  RunningRequest,
  ServerRequest,
  ServerRequestKind,
} from "@easyimmerse/state";
import { noDataFailure } from "@easyimmerse/state";
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

type StartedQuery = StartedMutation & {
  unsubscribe(): void;
  queryCacheKey: string;
};

type CacheEntry = { status: string; data?: unknown; error?: unknown };

type BackendState = { backend: { queries: Record<string, CacheEntry> } };

type StartedRequest = StartedMutation | StartedQuery;

type BackendDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

type StartRequest<K extends ServerRequestKind> = (
  request: RequestOf<K>,
) => ThunkAction<StartedRequest, unknown, unknown, UnknownAction>;

/**
 * Starts each kind of request through its endpoint, so that its cache tags and lifecycle apply as for any other caller.
 * Queries subscribe until they settle, so a tag invalidated meanwhile refetches the entry instead of removing it, and the entry then expires as any unused entry does.
 * Mutations are not tracked, so they leave no entry.
 * A job's status, the connection to Anki and the current principal are always fetched anew, since the cached answer is the one the request wants to replace.
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
  listAlignments: ({ projectId, mediaFileId }) =>
    backendApi.endpoints.listAlignments.initiate({ projectId, mediaFileId }),
  listFlashcards: ({ projectId }) =>
    backendApi.endpoints.listFlashcards.initiate(projectId),
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
  setTranslationDocument: ({
    projectId,
    mediaFileId,
    translationMediaFileId,
  }) =>
    backendApi.endpoints.setTranslationDocument.initiate(
      {
        projectId,
        mediaFileId,
        body: { translation_media_file_id: translationMediaFileId },
      },
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
  checkAnkiConnection: () =>
    backendApi.endpoints.checkAnkiConnection.initiate(undefined, {
      forceRefetch: true,
    }),
  sendFlashcardsToAnki: ({ projectId, flashcardIds }) =>
    backendApi.endpoints.sendFlashcardsToAnki.initiate(
      { projectId, flashcardIds },
      { track: false },
    ),
  deleteAnkiNotes: ({ projectId }) =>
    backendApi.endpoints.deleteAnkiNotes.initiate(projectId, { track: false }),
  exportAnkiPackage: ({
    projectId,
    flashcardIds,
    savePath,
    marksExported,
    staged,
  }) =>
    backendApi.endpoints.exportAnkiPackage.initiate(
      { projectId, flashcardIds, savePath, marksExported, staged },
      { track: false },
    ),
  recordAnkiExported: ({ projectId, flashcardIds, marksExported, readAtMs }) =>
    backendApi.endpoints.recordAnkiExported.initiate(
      { projectId, flashcardIds, marksExported, readAtMs },
      { track: false },
    ),
  clearAnkiPendingDeletions: ({ projectId, flashcardIds }) =>
    backendApi.endpoints.clearAnkiPendingDeletions.initiate(
      { projectId, flashcardIds },
      { track: false },
    ),
  setAnkiConnect: ({ projectId, usesAnkiConnect }) =>
    backendApi.endpoints.setAnkiConnect.initiate(
      { projectId, usesAnkiConnect },
      { track: false },
    ),
  logOut: () =>
    backendApi.endpoints.logOut.initiate(undefined, { track: false }),
  createUser: ({ via, request }) =>
    backendApi.endpoints.createUser.initiate(
      { via, request },
      { track: false },
    ),
  setUserRole: ({ via, userId, role }) =>
    backendApi.endpoints.setUserRole.initiate(
      { via, userId, body: { role } },
      { track: false },
    ),
  deleteUser: ({ via, userId }) =>
    backendApi.endpoints.deleteUser.initiate({ via, userId }, { track: false }),
  getCurrentPrincipal: ({ via }) =>
    backendApi.endpoints.getCurrentPrincipal.initiate(via, {
      forceRefetch: true,
    }),
  deleteSession: ({ via, sessionId }) =>
    backendApi.endpoints.deleteSession.initiate(
      { via, sessionId },
      { track: false },
    ),
  requestConfirmationEmail: ({ via }) =>
    backendApi.endpoints.requestConfirmationEmail.initiate(via, {
      track: false,
    }),
  linkSyncRemote: ({ request }) =>
    backendApi.endpoints.linkSyncRemote.initiate(request, { track: false }),
  unlinkSyncRemote: () =>
    backendApi.endpoints.unlinkSyncRemote.initiate(undefined, { track: false }),
  runSync: () =>
    backendApi.endpoints.runSync.initiate(undefined, { track: false }),
  dismissSyncConflicts: () =>
    backendApi.endpoints.dismissSyncConflicts.initiate(undefined, {
      track: false,
    }),
  getReviewQueue: ({ projectId }) =>
    backendApi.endpoints.getReviewQueue.initiate(projectId, { track: false }),
  answerReview: ({ projectId, flashcardId, rating, durationMs }) =>
    backendApi.endpoints.answerReview.initiate(
      { projectId, flashcardId, rating, durationMs },
      { track: false },
    ),
  undoReviewAnswer: ({ projectId, answerId }) =>
    backendApi.endpoints.undoReviewAnswer.initiate(
      { projectId, answerId },
      { track: false },
    ),
  raiseReviewAllowance: ({ projectId, extraNewCards, extraReviews }) =>
    backendApi.endpoints.raiseReviewAllowance.initiate(
      { projectId, extraNewCards, extraReviews },
      { track: false },
    ),
  holdReviewCard: ({ projectId, flashcardId, hold }) =>
    backendApi.endpoints.holdReviewCard.initiate(
      { projectId, flashcardId, hold },
      { track: false },
    ),
  liftReviewHold: ({ projectId, flashcardId }) =>
    backendApi.endpoints.liftReviewHold.initiate(
      { projectId, flashcardId },
      { track: false },
    ),
} satisfies { [K in ServerRequestKind]: StartRequest<K> };

/**
 * Sends a request through its endpoint in the store that `dispatch` belongs to, and reports its outcome.
 * Aborting a query that another caller started does not stop it, and the request then settles with its data.
 * A query settles with its entry's data once no fetch is pending for it, so a refetch that begins as the query's own fetch settles is awaited.
 * A query that ends with neither data nor an error settles as a failure.
 */
export const runRequest: RequestRunner = (request, dispatch) => {
  const start = requestEndpoints[request.kind] as StartRequest<
    typeof request.kind
  >;
  const started = (dispatch as BackendDispatch)(start(request));
  const settled = unwrapSettled(started, dispatch as BackendDispatch).then(
    (data): RequestOutcome =>
      isQuery(started) && data === undefined
        ? { ok: false, error: noDataFailure }
        : ({ ok: true, data } as RequestOutcome),
    (error): RequestOutcome => ({ ok: false, error: toRequestFailure(error) }),
  );
  if (isQuery(started)) settled.finally(() => started.unsubscribe());
  return { settled, abort: () => started.abort() } as RunningRequest<
    typeof request.kind
  >;
};

const entryPollMs = 10;

/** Unwraps a started request. For a query, waits until the cache entry has no fetch pending and reads the entry's latest result. */
async function unwrapSettled(
  started: StartedRequest,
  dispatch: BackendDispatch,
) {
  const data = await started.unwrap();
  if (!isQuery(started)) return data;
  for (;;) {
    const entry = dispatch(readEntry(started.queryCacheKey));
    if (entry?.status !== "pending") {
      if (entry?.status === "rejected") throw entry.error;
      return entry?.data;
    }
    await new Promise((resolve) => setTimeout(resolve, entryPollMs));
  }
}

function readEntry(queryCacheKey: string) {
  return (_dispatch: unknown, getState: () => unknown) =>
    (getState() as BackendState).backend.queries[queryCacheKey];
}

function isQuery(started: StartedRequest): started is StartedQuery {
  return "unsubscribe" in started;
}
