import {
  type LicenseNoticeGroup,
  loadLicenseNoticeGroups,
} from "@easyimmerse/licenses";
import type {
  AccountVia,
  AnkiConnection,
  AnkiDeletionOutcome,
  AnkiPackageExport,
  AnkiSendOutcome,
  PickedDictionaryFile,
} from "@easyimmerse/state";
import { actions, cacheKey, serverCachePath } from "@easyimmerse/state";
import type {
  AccountUser,
  AddAlignmentRequest,
  AddMediaFileRequest,
  AddSubtitleTrackRequest,
  Alignment,
  AlignmentsResponse,
  AnkiConnectSetting,
  AnkiDeletionsCleared,
  AnkiExportedRequest,
  AnkiPendingDeletions,
  ApplyLibraryEntry,
  BatchLookupRequest,
  BatchLookupResponse,
  ConversionCacheBudget,
  ConversionCacheStatus,
  ConversionCapabilities,
  CreateUserRequest,
  CurrentPrincipal,
  Document,
  EmbeddedSubtitleTracksResponse,
  Flashcard,
  FlashcardDraft,
  ImportFormRequest,
  ImportJobStarted,
  ImportJobStatus,
  ImportStepRequest,
  ImportStepResponse,
  LibraryItem,
  LibraryItemAdded,
  LibraryItemDraft,
  LibraryListing,
  LibrarySegment,
  LibrarySubtitles,
  LibraryText,
  LibraryWord,
  LinkRemoteRequest,
  ListDictionariesResponse,
  ListFlashcardsResponse,
  ListMediaFilesResponse,
  ListPluginsResponse,
  ListProjectsResponse,
  ListReviewCountsResponse,
  ListSyncConflictsResponse,
  LookupQuery,
  LookupResponse,
  MediaAvailabilityResponse,
  MediaFile,
  MediaSourceJob,
  NewFlashcard,
  NewLibraryFlashcard,
  PairingCode,
  ParseTimedTextRequest,
  PlaybackMethodRequest,
  PlaybackMethodResponse,
  PluginForm,
  Project,
  ProjectSettings,
  ReviewAllowanceRequest,
  ReviewAnswerRequest,
  ReviewAnswerResponse,
  ReviewAnswerUndone,
  ReviewHoldKind,
  ReviewHoldRequest,
  ReviewQueue,
  ReviewRating,
  ReviewSummary,
  ServerAuthInfo,
  SessionList,
  SetLibraryManager,
  SetUserRoleRequest,
  SourceStepRequest,
  SourceStepResponse,
  StorageStatus,
  StoredCopy,
  SubtitleSelection,
  SubtitleTrack,
  SubtitleTracksResponse,
  SyncStatus,
  TablePreview,
  TimedTextTrack,
  TrackSelection,
  TracksResponse,
  TranslationDocumentSelection,
  UploadChoiceRequest,
  WaveformResponse,
} from "@easyimmerse/types";
import type { BaseQueryApi, QueryReturnValue } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import { checkAnkiConnection } from "./ankiConnection.ts";
import { createMediaFetch } from "./ankiMedia.ts";
import { type AnkiExportArgs, exportAnkiPackage } from "./ankiPackageExport.ts";
import type {
  BackendError,
  BackendRequest,
  BackendResult,
} from "./backendClient.ts";
import {
  type CapturedFrame,
  captureFrame,
  type FrameArgs,
  probePictures,
} from "./browserFrames.ts";
import { deleteAnkiNotes } from "./deleteAnkiNotes.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { injectedBaseQuery } from "./injectedBaseQuery.ts";
import {
  isQuerySubscribed,
  type SubscriptionActions,
} from "./isQuerySubscribed.ts";
import {
  type LibraryFileUploadArgs,
  uploadLibraryFile,
} from "./libraryFileUpload.ts";
import { followLibraryItemFetch } from "./libraryItemPolling.ts";
import { loadLicenseNotices } from "./loadLicenseNotices.ts";
import { lookupsInBatchReach } from "./lookupBatches.ts";
import { lookupResponseAt } from "./lookupResponseAt.ts";
import { type BookArgs, parseBook } from "./parseBook.ts";
import {
  type ImportPickedDictionaryArgs,
  importPickedDictionary,
  previewPickedDictionaryTable,
} from "./pickedDictionary.ts";
import type { PickedFile } from "./readPickedFile.ts";
import {
  type AnkiSendArgs,
  type ServerQuery,
  sendFlashcardsToAnki,
} from "./sendToAnki.ts";
import {
  type StoredCopyUploadArgs,
  uploadStoredCopy,
} from "./storedCopyUpload.ts";
import { utcOffsetMinOf } from "./utcOffsetMinOf.ts";

type ProjectArgs = { projectId: string; settings: ProjectSettings };

type FlashcardArgs = { projectId: string; flashcardId: string };

type AddMediaFileArgs = { projectId: string; request: AddMediaFileRequest };

type ImportFormArgs = { projectId: string; request: ImportFormRequest };

type ImportStepArgs = { projectId: string; request: ImportStepRequest };

type MediaSourceJobArgs = { projectId: string; jobId: string };

type SourceStepArgs = MediaFileArgs & { request: SourceStepRequest };

type MediaFileArgs = { projectId: string; mediaFileId: string };

type ChoosePlaybackMethodArgs = MediaFileArgs & {
  request: PlaybackMethodRequest;
};

type SaveTrackSelectionArgs = MediaFileArgs & { selection: TrackSelection };

type WaveformWindowArgs = MediaFileArgs & { startMs: number; endMs: number };

type AddSubtitleTrackArgs = MediaFileArgs & {
  request: AddSubtitleTrackRequest;
};

type SubtitleTrackArgs = MediaFileArgs & { trackId: string };

type SubtitleSelectionArgs = MediaFileArgs & { selection: SubtitleSelection };

type AddAlignmentArgs = MediaFileArgs & { body: AddAlignmentRequest };

type AlignmentArgs = MediaFileArgs & { alignmentId: string };

type TranslationDocumentArgs = MediaFileArgs & {
  body: TranslationDocumentSelection;
};

type UploadChoiceArgs = MediaFileArgs & { isUploadChosen: boolean };

type CreateUserArgs = { via: AccountVia; request: CreateUserRequest };

type UserRoleArgs = {
  via: AccountVia;
  userId: string;
  body: SetUserRoleRequest;
};

type UserArgs = { via: AccountVia; userId: string };

type SessionArgs = { via: AccountVia; sessionId: string };

type AnkiConnectArgs = { projectId: string; usesAnkiConnect: boolean };

type AnkiDeletionsClearArgs = {
  projectId: string;
  flashcardIds: readonly string[];
};

type ReviewAnswerArgs = {
  projectId: string;
  flashcardId: string;
  rating: ReviewRating;
  durationMs: number;
};

type ReviewUndoArgs = { projectId: string; answerId: string };

type ReviewAllowanceArgs = {
  projectId: string;
  extraNewCards: number;
  extraReviews: number;
};

type ReviewHoldArgs = {
  projectId: string;
  flashcardId: string;
  hold: ReviewHoldKind;
};

type LibraryItemArgs = { itemId: string; draft: LibraryItemDraft };

type AddLibraryItemArgs = { itemId: string; projectId: string | null };

type LibraryFlashcardArgs = MediaFileArgs & { card: NewLibraryFlashcard };

type LibrarySubtitlesArgs = { itemId: string; subtitles: LibrarySubtitles };

type LibraryWordsArgs = {
  itemId: string;
  segmentIndex: number;
  words: readonly LibraryWord[];
};

type ApplyLibraryEntryArgs = { itemId: string; apply: ApplyLibraryEntry };

type LibraryManagerArgs = { userId: string; managesLibrary: boolean };

type AnkiExportedArgs = {
  projectId: string;
  flashcardIds: readonly string[];
  marksExported: boolean;
  readAtMs: number;
};

/** Encodes the text around a looked-up character, when the caller has it, as query parameters. */
const lookupContextQuery = (
  context: string | undefined,
  offset: number | undefined,
): Record<string, string> =>
  context === undefined || offset === undefined
    ? {}
    : { context, offset: String(offset) };

/**
 * How long, in seconds, a lookup stays cached once nothing shows it.
 * It outlasts the minute of playback that `prefetchLookups` looks ahead, so that a word looked up early is still cached when it comes up.
 */
export const lookupCacheSeconds = 300;

const mediaFilePath = ({ projectId, mediaFileId }: MediaFileArgs) =>
  `/projects/${projectId}/media/${mediaFileId}`;

const subtitleTracksTag = ({ mediaFileId }: MediaFileArgs) =>
  [{ type: "SubtitleTracks", id: mediaFileId }] as const;

const alignmentsTag = ({ mediaFileId }: MediaFileArgs) =>
  [{ type: "Alignments", id: mediaFileId }] as const;

/**
 * Puts a media file the server added into the project's list.
 * The new file's entry decides which screen opens it, so it joins the list at once.
 * The refetch that the invalidation starts can wait for other requests to finish.
 */
function listMediaFileAtOnce(
  dispatch: (action: unknown) => unknown,
  projectId: string,
  added: MediaFile,
) {
  dispatch(
    backendApi.util.updateQueryData("listMediaFiles", projectId, (list) => {
      if (!list.media_files.some(({ id }) => id === added.id))
        list.media_files.push(added);
    }),
  );
}

/**
 * Puts the flashcard a save returned into the project's cached list, in place of an older version of it.
 * The list shows the saved flashcard at once, while the refetch that the invalidation starts may come later.
 */
async function listSavedFlashcard(
  dispatch: (action: unknown) => unknown,
  projectId: string,
  queryFulfilled: Promise<{ data: Flashcard }>,
) {
  const result = await queryFulfilled.catch(() => null);
  if (result === null) return;
  const saved = result.data;
  dispatch(
    backendApi.util.updateQueryData("listFlashcards", projectId, (list) => {
      const index = list.flashcards.findIndex(({ id }) => id === saved.id);
      const listed = list.flashcards[index];
      if (listed === undefined) list.flashcards.push(saved);
      else if (listed.updated_at_ms <= saved.updated_at_ms)
        list.flashcards[index] = saved;
    }),
  );
}

/** Sends JSON requests to the server through an endpoint's base query, for query functions that send several. */
function serverQueryOf(
  baseQuery: (
    request: BackendRequest,
  ) =>
    | QueryReturnValue<unknown, BackendError, unknown>
    | PromiseLike<QueryReturnValue<unknown, BackendError, unknown>>,
): ServerQuery {
  return async (request) =>
    (await baseQuery(request)) as BackendResult<unknown>;
}

/**
 * Keeps the last check of the connection to Anki in step with what a send or a deletion found,
 * and tells whether Anki answered although the last check or report had not found it running.
 */
function reportAnkiConnection(
  api: Pick<BaseQueryApi, "dispatch" | "getState">,
  connection: AnkiConnection,
): boolean {
  const last = backendApi.endpoints.checkAnkiConnection.select()(
    api.getState() as BackendState,
  ).data;
  api.dispatch(
    backendApi.util.upsertQueryData(
      "checkAnkiConnection",
      undefined,
      connection,
    ),
  );
  return connection.connected && last?.connected !== true;
}

/**
 * The data an export or a send to Anki changes: which flashcards went where, the deletions it records or clears, the project's counts,
 * and what waits in its review.
 */
const flashcardsSentTags = (projectId: string) =>
  [
    { type: "Flashcards", id: projectId },
    { type: "AnkiPendingDeletions", id: projectId },
    { type: "Projects", id: projectId },
    "Projects",
    { type: "Review", id: projectId },
  ] as const;

/** The data an answer or its undo changes: what waits in the project's review, and the counts of due and unreviewed cards in the project list. */
const reviewAnsweredTags = (projectId: string) =>
  [
    { type: "Review", id: projectId },
    { type: "Projects", id: projectId },
    "Projects",
  ] as const;

/** The data a hold or its lift changes: what an answer changes, and whether the project's flashcards are suspended. */
const reviewHeldTags = (projectId: string) =>
  [
    ...reviewAnsweredTags(projectId),
    { type: "Flashcards", id: projectId },
  ] as const;

/** The client's UTC offset now, as a query parameter of the review routes, which place the current time in the user's local day. */
const utcOffsetQuery = () => ({
  utc_offset_min: String(utcOffsetMinOf(new Date())),
});

const mediaFileAddedTags = (projectId: string) =>
  [
    { type: "MediaFiles", id: projectId },
    { type: "Projects", id: projectId },
    "Projects",
  ] as const;

const libraryItemPath = (itemId: string) =>
  `/library/items/${encodeURIComponent(itemId)}`;

/** The tag of the library's listing, which every change to an item makes stale. */
const libraryListTag = { type: "Library", id: "list" } as const;

const libraryItemTag = (itemId: string) =>
  ({ type: "Library", id: itemId }) as const;

const libraryTextTag = (itemId: string) =>
  ({ type: "Library", id: `${itemId}/text` }) as const;

/** Puts the item a change answered with into its cache entry at once, as the library management screen shows it. */
async function cacheLibraryItem(
  dispatch: (action: unknown) => unknown,
  queryFulfilled: Promise<{ data: LibraryItem }>,
) {
  const result = await queryFulfilled.catch(() => null);
  if (result === null) return;
  dispatch(
    backendApi.util.upsertQueryData(
      "getLibraryItem",
      result.data.id,
      result.data,
    ),
  );
}

/** Puts the text a change answered with into the item's cache entry at once. */
async function cacheLibraryText(
  dispatch: (action: unknown) => unknown,
  itemId: string,
  queryFulfilled: Promise<{ data: LibraryText }>,
) {
  const result = await queryFulfilled.catch(() => null);
  if (result === null) return;
  dispatch(
    backendApi.util.upsertQueryData("getLibraryText", itemId, result.data),
  );
}

/** Puts the segment whose words a change set into the item's cached text, in place of the segment before it. */
async function cacheLibrarySegment(
  dispatch: (action: unknown) => unknown,
  itemId: string,
  queryFulfilled: Promise<{ data: LibrarySegment }>,
) {
  const result = await queryFulfilled.catch(() => null);
  if (result === null) return;
  const saved = result.data;
  dispatch(
    backendApi.util.updateQueryData("getLibraryText", itemId, (text) => {
      const index = text.segments.findIndex(
        (each) => each.index === saved.index,
      );
      if (index >= 0) text.segments[index] = saved;
    }),
  );
}

/** The path under which the built-in server forwards account routes to the remote it is linked to. */
const linkedRemotePrefix = "/sync/remote";

/** The path of an account route on the server that `via` names. */
export function accountPath(via: AccountVia, path: string): string {
  return via === "linkedRemote" ? `${linkedRemotePrefix}${path}` : path;
}

/** The data that rows pulled from a remote may have changed. */
const pulledDataTags = [
  "Projects",
  "MediaFiles",
  "Flashcards",
  "AnkiPendingDeletions",
  "SubtitleTracks",
  "Alignments",
  "Dictionaries",
  "Review",
] as const;

/** What linking to a remote, or unlinking from it, changes: the status, the account reached through it, and whether projects are backed up. */
const linkChangedTags = [
  "SyncStatus",
  "CurrentPrincipal",
  "Projects",
  "Sessions",
  "Users",
] as const;

/** The cache tags that a new sync status makes stale, compared with the one before it. */
function staleTagsBetween(before: SyncStatus, after: SyncStatus) {
  if (after.pulled_revision !== before.pulled_revision) return pulledDataTags;
  const hasPushed =
    after.local_change_seq !== before.local_change_seq ||
    after.link?.pushed_through_seq !== before.link?.pushed_through_seq;
  if (hasPushed) return ["Projects", "StorageStatus"] as const;
  // An upload that began or ended changes which copies the remote keeps.
  const hasTransferChanged =
    after.link?.transfer?.media_file_id !==
    before.link?.transfer?.media_file_id;
  return hasTransferChanged ? (["StorageStatus"] as const) : [];
}

/** The server operations the app uses, one endpoint each. Bodies and paths follow the OpenAPI document. */
export const backendApi = createApi({
  reducerPath: serverCachePath,
  // The state package reads entries from the cache, so it decides the keys they are stored under.
  serializeQueryArgs: ({ endpointName, queryArgs }) =>
    cacheKey(endpointName, queryArgs),
  baseQuery: injectedBaseQuery,
  tagTypes: [
    "Projects",
    "MediaFiles",
    "Flashcards",
    "AnkiPendingDeletions",
    "SubtitleTracks",
    "Alignments",
    "Dictionaries",
    "ConversionCache",
    "ConversionCapabilities",
    "Users",
    "CurrentPrincipal",
    "Sessions",
    "Review",
    "PairingCode",
    "SyncStatus",
    "SyncConflicts",
    "StorageStatus",
    "Library",
  ],
  endpoints: (build) => ({
    listProjects: build.query<ListProjectsResponse, void>({
      query: () => ({ method: "GET", path: "/projects" }),
      providesTags: ["Projects"],
    }),
    /** A project is kept for the session: the automatic send to Anki after a save reads from the cache whether it uses AnkiConnect, and tag invalidation still refreshes it. */
    getProject: build.query<Project, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}`,
      }),
      keepUnusedDataFor: Infinity,
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: projectId },
      ],
    }),
    createProject: build.mutation<Project, ProjectSettings>({
      query: (settings) => ({
        method: "POST",
        path: "/projects",
        body: { kind: "json", value: settings },
      }),
      invalidatesTags: ["Projects"],
    }),
    updateProject: build.mutation<Project, ProjectArgs>({
      query: ({ projectId, settings }) => ({
        method: "PUT",
        path: `/projects/${projectId}`,
        body: { kind: "json", value: settings },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        "Projects",
        { type: "Projects", id: projectId },
      ],
    }),
    markProjectOpened: build.mutation<void, string>({
      query: (projectId) => ({
        method: "POST",
        path: `/projects/${projectId}/opened`,
      }),
      invalidatesTags: ["Projects"],
    }),
    listFlashcards: build.query<ListFlashcardsResponse, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}/flashcards`,
      }),
      providesTags: (_result, _error, projectId) => [
        { type: "Flashcards", id: projectId },
      ],
    }),
    createFlashcard: build.mutation<
      Flashcard,
      { projectId: string; flashcard: NewFlashcard }
    >({
      query: ({ projectId, flashcard }) => ({
        method: "POST",
        path: `/projects/${projectId}/flashcards`,
        body: { kind: "json", value: flashcard },
      }),
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        await listSavedFlashcard(dispatch, projectId, queryFulfilled);
      },
      // Saving a flashcard deleted earlier, as an Undo does, forgets its deletion from Anki.
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Flashcards", id: projectId },
        { type: "AnkiPendingDeletions", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
        { type: "Review", id: projectId },
      ],
    }),
    updateFlashcard: build.mutation<
      Flashcard,
      FlashcardArgs & { draft: FlashcardDraft }
    >({
      query: ({ projectId, flashcardId, draft }) => ({
        method: "PUT",
        path: `/projects/${projectId}/flashcards/${flashcardId}`,
        body: { kind: "json", value: draft },
      }),
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        await listSavedFlashcard(dispatch, projectId, queryFulfilled);
      },
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Flashcards", id: projectId },
        { type: "Review", id: projectId },
      ],
    }),
    deleteFlashcard: build.mutation<void, FlashcardArgs>({
      query: ({ projectId, flashcardId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/flashcards/${flashcardId}`,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Flashcards", id: projectId },
        { type: "AnkiPendingDeletions", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
        { type: "Review", id: projectId },
      ],
    }),
    /** What waits in a project's review today, as the flashcards panel shows it. */
    getReviewSummary: build.query<ReviewSummary, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}/review`,
        query: utcOffsetQuery(),
      }),
      providesTags: (_result, _error, projectId) => [
        { type: "Review", id: projectId },
      ],
    }),
    /** What waits in each project's review today, counted as the queue counts it, as the list of projects shows it. */
    listReviewCounts: build.query<ListReviewCountsResponse, void>({
      query: () => ({
        method: "GET",
        path: "/review/counts",
        query: utcOffsetQuery(),
      }),
      providesTags: (result) => [
        "Review",
        ...(result?.projects ?? []).map(({ project_id }) => ({
          type: "Review" as const,
          id: project_id,
        })),
      ],
    }),
    /**
     * The cards of a review session, in the order they are shown. The answer is not cached,
     * since the review screen keeps the session's cards and fetches the queue again only when it runs out.
     * The screen keeps only each card's id and schedule, and reads its content from the flashcards list.
     */
    getReviewQueue: build.mutation<ReviewQueue, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}/review/queue`,
        query: utcOffsetQuery(),
      }),
      // The review takes each card's content from the flashcards list, which a fetch after the queue's brings up to date with it.
      invalidatesTags: (_result, _error, projectId) => [
        { type: "Flashcards", id: projectId },
      ],
    }),
    answerReview: build.mutation<ReviewAnswerResponse, ReviewAnswerArgs>({
      query: ({ projectId, flashcardId, rating, durationMs }) => ({
        method: "POST",
        path: `/projects/${projectId}/review/answers`,
        body: {
          kind: "json",
          value: {
            flashcard_id: flashcardId,
            rating,
            utc_offset_min: utcOffsetMinOf(new Date()),
            duration_ms: durationMs,
          } satisfies ReviewAnswerRequest,
        },
      }),
      invalidatesTags: (_result, _error, { projectId }) =>
        reviewAnsweredTags(projectId),
    }),
    /** Undoes the project's latest answer, which the id of its log entry names. The server refuses any other with a 409. */
    undoReviewAnswer: build.mutation<ReviewAnswerUndone, ReviewUndoArgs>({
      query: ({ projectId, answerId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/review/answers/${answerId}`,
        query: utcOffsetQuery(),
      }),
      invalidatesTags: (_result, _error, { projectId }) =>
        reviewAnsweredTags(projectId),
    }),
    raiseReviewAllowance: build.mutation<void, ReviewAllowanceArgs>({
      query: ({ projectId, extraNewCards, extraReviews }) => ({
        method: "POST",
        path: `/projects/${projectId}/review/allowance`,
        body: {
          kind: "json",
          value: {
            utc_offset_min: utcOffsetMinOf(new Date()),
            extra_new_cards: extraNewCards,
            extra_reviews: extraReviews,
          } satisfies ReviewAllowanceRequest,
        },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Review", id: projectId },
      ],
    }),
    /** Buries a card until the user's next day begins, or suspends it until they unsuspend it. */
    holdReviewCard: build.mutation<void, ReviewHoldArgs>({
      query: ({ projectId, flashcardId, hold }) => ({
        method: "PUT",
        path: `/projects/${projectId}/review/holds/${flashcardId}`,
        body: {
          kind: "json",
          value: {
            kind: hold,
            utc_offset_min: utcOffsetMinOf(new Date()),
          } satisfies ReviewHoldRequest,
        },
      }),
      invalidatesTags: (_result, _error, { projectId }) =>
        reviewHeldTags(projectId),
    }),
    /** Brings a card back into the review, as unburying or unsuspending it does. */
    liftReviewHold: build.mutation<void, FlashcardArgs>({
      query: ({ projectId, flashcardId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/review/holds/${flashcardId}`,
      }),
      invalidatesTags: (_result, _error, { projectId }) =>
        reviewHeldTags(projectId),
    }),
    listPlugins: build.query<ListPluginsResponse, void>({
      query: () => ({ method: "GET", path: "/plugins" }),
    }),
    listMediaFiles: build.query<ListMediaFilesResponse, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}/media`,
      }),
      providesTags: (_result, _error, projectId) => [
        { type: "MediaFiles", id: projectId },
      ],
    }),
    /** Asks the server whether it can open each of the project's media files at a path. */
    getMediaAvailability: build.query<MediaAvailabilityResponse, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}/media/availability`,
      }),
      providesTags: (_result, _error, projectId) => [
        { type: "MediaFiles", id: projectId },
      ],
    }),
    addMediaFile: build.mutation<MediaFile, AddMediaFileArgs>({
      query: ({ projectId, request }) => ({
        method: "POST",
        path: `/projects/${projectId}/media`,
        body: { kind: "json", value: request },
      }),
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result !== null)
          listMediaFileAtOnce(dispatch, projectId, result.data);
      },
      invalidatesTags: (_result, _error, { projectId }) =>
        mediaFileAddedTags(projectId),
    }),
    /** Asks a media-source plugin for the first form of its import interface. */
    getImportForm: build.mutation<PluginForm, ImportFormArgs>({
      query: ({ projectId, request }) => ({
        method: "POST",
        path: `/projects/${projectId}/media/import-form`,
        body: { kind: "json", value: request },
      }),
    }),
    /**
     * Sends an action of a media-source plugin's import form. The plugin answers with the next form,
     * or the server starts the import as a job, which is polled through `getMediaSourceJob`.
     */
    submitImportStep: build.mutation<ImportStepResponse, ImportStepArgs>({
      query: ({ projectId, request }) => ({
        method: "POST",
        path: `/projects/${projectId}/media/import-step`,
        body: { kind: "json", value: request },
      }),
    }),
    /** A fetch through a media-source plugin. Once it is done, its media file joins the project's list. */
    getMediaSourceJob: build.query<MediaSourceJob, MediaSourceJobArgs>({
      query: ({ projectId, jobId }) => ({
        method: "GET",
        path: `/projects/${projectId}/media/from-source/${jobId}`,
      }),
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        const added = result?.data.media_file;
        if (result?.data.status !== "done" || !added) return;
        listMediaFileAtOnce(dispatch, projectId, added);
        dispatch(
          backendApi.util.invalidateTags([...mediaFileAddedTags(projectId)]),
        );
      },
    }),
    removeMediaFile: build.mutation<void, MediaFileArgs>({
      query: ({ projectId, mediaFileId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/media/${mediaFileId}`,
      }),
      // Removing a file also removes the alignments of other documents that name it.
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
        { type: "Flashcards", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
        "Alignments",
      ],
    }),
    /** How much of the upload allowance the copies of media files kept on the server that `via` names take, and which copies they are. */
    getStorageStatus: build.query<StorageStatus, AccountVia>({
      query: (via) => ({ method: "GET", path: accountPath(via, "/storage") }),
      providesTags: ["StorageStatus"],
    }),
    /** Records whether to keep a copy of a media file's bytes on a server. Turning it off deletes the copy. */
    setUploadChoice: build.mutation<MediaFile, UploadChoiceArgs>({
      query: ({ isUploadChosen, ...args }) => ({
        method: "PUT",
        path: `${mediaFilePath(args)}/upload-choice`,
        body: {
          kind: "json",
          value: {
            is_upload_chosen: isUploadChosen,
          } satisfies UploadChoiceRequest,
        },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
        "StorageStatus",
        "SyncStatus",
      ],
    }),
    /** Sends the bytes of a file a browser holds for the server to keep a copy of, which also records the choice to keep one. */
    uploadStoredCopy: build.mutation<StoredCopy, StoredCopyUploadArgs>({
      queryFn: (args, api, _extraOptions, baseQuery) =>
        uploadStoredCopy(args, api.extra as BackendThunkExtra, baseQuery),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
        "StorageStatus",
      ],
    }),
    /** Has the native app's built-in server download the copy that its remote keeps of a media file. It answers once the download is done. */
    fetchStoredCopy: build.mutation<StoredCopy, MediaFileArgs>({
      query: (args) => ({
        method: "POST",
        path: `${mediaFilePath(args)}/stored-copy/fetch`,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
        "StorageStatus",
      ],
    }),
    getMediaTracks: build.query<TracksResponse, MediaFileArgs>({
      query: (args) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/tracks`,
      }),
    }),
    choosePlaybackMethod: build.query<
      PlaybackMethodResponse,
      ChoosePlaybackMethodArgs
    >({
      query: ({ request, ...args }) => ({
        method: "POST",
        path: `${mediaFilePath(args)}/playback-method`,
        body: { kind: "json", value: request },
      }),
    }),
    saveTrackSelection: build.mutation<void, SaveTrackSelectionArgs>({
      query: ({ selection, ...args }) => ({
        method: "PUT",
        path: `${mediaFilePath(args)}/track-selection`,
        body: { kind: "json", value: selection },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
      ],
    }),
    /**
     * One window of a media file's waveform peaks. The media screen's update requests the windows,
     * and the waveform reads their peaks from the cache, which keeps every window for the rest of the session.
     */
    getWaveformWindow: build.query<WaveformResponse, WaveformWindowArgs>({
      keepUnusedDataFor: Infinity,
      query: ({ startMs, endMs, ...args }) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/waveform`,
        query: { start_ms: String(startMs), end_ms: String(endMs) },
      }),
    }),
    listEmbeddedSubtitleTracks: build.query<
      EmbeddedSubtitleTracksResponse,
      MediaFileArgs
    >({
      query: (args) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/embedded-subtitles`,
      }),
    }),
    listSubtitleTracks: build.query<SubtitleTracksResponse, MediaFileArgs>({
      query: (args) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/subtitles`,
      }),
      providesTags: (_result, _error, args) => subtitleTracksTag(args),
    }),
    /**
     * Asks the plugin a media file was imported through for the first form of its media interface.
     * The answer is not cached, since the plugin may offer something different each time.
     */
    getSourceForm: build.mutation<PluginForm, MediaFileArgs>({
      query: (args) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/source-form`,
      }),
    }),
    /**
     * Sends an action of a media file's source form. The plugin answers with the next form, or the server applies its changes.
     * Applied changes come with the media file's tracks, which replace the cached ones.
     * A failure may come after some changes were made, so it refreshes the media file's tracks.
     */
    submitSourceStep: build.mutation<SourceStepResponse, SourceStepArgs>({
      query: ({ request, ...args }) => ({
        method: "POST",
        path: `${mediaFilePath(args)}/source-step`,
        body: { kind: "json", value: request },
      }),
      async onQueryStarted(
        { projectId, mediaFileId },
        { dispatch, queryFulfilled },
      ) {
        const answer = await queryFulfilled.then(
          ({ data }) => data,
          () => undefined,
        );
        if (answer?.kind !== "applied") return;
        const { tracks, selection } = answer;
        dispatch(
          backendApi.util.updateQueryData(
            "listSubtitleTracks",
            { projectId, mediaFileId },
            () => ({ tracks, selection }),
          ),
        );
      },
      invalidatesTags: (_result, error, args) =>
        error === undefined ? [] : subtitleTracksTag(args),
    }),
    addSubtitleTrack: build.mutation<SubtitleTrack, AddSubtitleTrackArgs>({
      query: ({ request, ...args }) => ({
        method: "POST",
        path: `${mediaFilePath(args)}/subtitles`,
        body: { kind: "json", value: request },
      }),
      invalidatesTags: (_result, _error, args) => subtitleTracksTag(args),
    }),
    getSubtitleCues: build.query<TimedTextTrack, SubtitleTrackArgs>({
      query: ({ trackId, ...args }) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/subtitles/${trackId}/cues`,
      }),
    }),
    setSubtitleSelection: build.mutation<void, SubtitleSelectionArgs>({
      query: ({ selection, ...args }) => ({
        method: "PUT",
        path: `${mediaFilePath(args)}/subtitle-selection`,
        body: { kind: "json", value: selection },
      }),
      // The track menus show the choice at once instead of the old one until the list is fetched again.
      async onQueryStarted(
        { selection, ...args },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          backendApi.util.updateQueryData(
            "listSubtitleTracks",
            args,
            (list) => {
              list.selection = selection;
            },
          ),
        );
        await queryFulfilled.catch(patch.undo);
      },
      invalidatesTags: (_result, _error, args) => subtitleTracksTag(args),
    }),
    /** A document's alignments with its audio and its translation, newest first. */
    listAlignments: build.query<AlignmentsResponse, MediaFileArgs>({
      query: (args) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/alignments`,
      }),
      providesTags: (_result, _error, args) => alignmentsTag(args),
    }),
    addAlignment: build.mutation<Alignment, AddAlignmentArgs>({
      query: ({ body, ...args }) => ({
        method: "POST",
        path: `${mediaFilePath(args)}/alignments`,
        body: { kind: "json", value: body },
      }),
      invalidatesTags: (_result, _error, args) => alignmentsTag(args),
    }),
    removeAlignment: build.mutation<void, AlignmentArgs>({
      query: ({ alignmentId, ...args }) => ({
        method: "DELETE",
        path: `${mediaFilePath(args)}/alignments/${encodeURIComponent(alignmentId)}`,
      }),
      invalidatesTags: (_result, _error, args) => alignmentsTag(args),
    }),
    /** Pairs a document with the translation it is read beside, before the two are aligned, or clears the pairing. */
    setTranslationDocument: build.mutation<MediaFile, TranslationDocumentArgs>({
      query: ({ body, ...args }) => ({
        method: "PUT",
        path: `${mediaFilePath(args)}/translation-document`,
        body: { kind: "json", value: body },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
      ],
    }),
    getConversionCacheStatus: build.query<ConversionCacheStatus, void>({
      query: () => ({ method: "GET", path: "/conversion-cache" }),
      providesTags: ["ConversionCache"],
    }),
    clearConversionCache: build.mutation<ConversionCacheStatus, void>({
      query: () => ({ method: "POST", path: "/conversion-cache/clear" }),
      invalidatesTags: ["ConversionCache", "ConversionCapabilities"],
    }),
    setConversionCacheBudget: build.mutation<
      ConversionCacheStatus,
      ConversionCacheBudget
    >({
      query: (budget) => ({
        method: "PUT",
        path: "/conversion-cache/budget",
        body: { kind: "json", value: budget },
      }),
      invalidatesTags: ["ConversionCache", "ConversionCapabilities"],
    }),
    getConversionCapabilities: build.query<ConversionCapabilities, void>({
      query: () => ({ method: "GET", path: "/conversion/capabilities" }),
      providesTags: ["ConversionCapabilities"],
    }),
    parseTimedText: build.mutation<TimedTextTrack, ParseTimedTextRequest>({
      query: (request) => ({
        method: "POST",
        path: "/timed-text/parse",
        body: { kind: "json", value: request },
        offlineOperation: { kind: "parseTimedText", request },
      }),
    }),
    /** Parses a book once while it is read. The entry goes as soon as no reader shows the book, since a document can be large. */
    openBook: build.query<Document, BookArgs>({
      queryFn: (book, api, _extraOptions, baseQuery) =>
        parseBook(book, api.extra as BackendThunkExtra, baseQuery),
      keepUnusedDataFor: 0,
    }),
    /** Whether a file the browser holds shows pictures. The answer is kept for the session, since it is small and the flashcard rules will read it. */
    probePictures: build.query<boolean, PickedFile>({
      queryFn: (file, api) =>
        probePictures(file, api.extra as BackendThunkExtra),
      keepUnusedDataFor: Infinity,
    }),
    /**
     * A frame of a file the browser holds, with the file it comes from, since a query hook's last data outlives a change of its arguments.
     * A frame is a large data URL, so an unused one goes after RTK Query's default minute.
     */
    captureFrame: build.query<CapturedFrame, FrameArgs>({
      queryFn: (args, api) =>
        captureFrame(
          args,
          api.extra as BackendThunkExtra,
          () => !isQuerySubscribed(api, subscriptionActions()),
        ),
    }),
    /**
     * Whether Anki answers through AnkiConnect. The last answer is kept for the session, and a send to Anki or a deletion from it updates it,
     * so that the project overview shows the connection as last seen.
     */
    checkAnkiConnection: build.query<AnkiConnection, void>({
      queryFn: (_arg, api) =>
        checkAnkiConnection((api.extra as BackendThunkExtra).ankiConnect),
      keepUnusedDataFor: Infinity,
    }),
    /** Sends flashcards to Anki through AnkiConnect, from the page, since Anki runs on the user's machine. */
    sendFlashcardsToAnki: build.mutation<AnkiSendOutcome, AnkiSendArgs>({
      queryFn: (args, api, _extraOptions, baseQuery) => {
        const extra = api.extra as BackendThunkExtra;
        return sendFlashcardsToAnki(args, {
          anki: extra.ankiConnect,
          server: serverQueryOf(baseQuery),
          fetchMedia: createMediaFetch(extra.serverFetch),
          reportConnection: (connection) =>
            reportAnkiConnection(api, connection),
        });
      },
      invalidatesTags: (_result, _error, { projectId }) =>
        flashcardsSentTags(projectId),
    }),
    /** The project's deleted flashcards whose notes may still be in Anki. */
    listAnkiPendingDeletions: build.query<AnkiPendingDeletions, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}/anki/pending-deletions`,
      }),
      providesTags: (_result, _error, projectId) => [
        { type: "AnkiPendingDeletions", id: projectId },
      ],
    }),
    /** Deletes from Anki the notes of the project's deleted flashcards, through AnkiConnect from the page. */
    deleteAnkiNotes: build.mutation<AnkiDeletionOutcome, string>({
      queryFn: (projectId, api, _extraOptions, baseQuery) =>
        deleteAnkiNotes(projectId, {
          anki: (api.extra as BackendThunkExtra).ankiConnect,
          server: serverQueryOf(baseQuery),
          reportConnection: (connection) =>
            reportAnkiConnection(api, connection),
        }),
      invalidatesTags: (_result, _error, projectId) => [
        { type: "AnkiPendingDeletions", id: projectId },
      ],
    }),
    /** Forgets the named deletions from Anki, which the user marked done. */
    clearAnkiPendingDeletions: build.mutation<void, AnkiDeletionsClearArgs>({
      query: ({ projectId, flashcardIds }) => ({
        method: "POST",
        path: `/projects/${projectId}/anki/pending-deletions/cleared`,
        body: {
          kind: "json",
          value: {
            flashcard_ids: [...flashcardIds],
          } satisfies AnkiDeletionsCleared,
        },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "AnkiPendingDeletions", id: projectId },
      ],
    }),
    /** Exports flashcards as an Anki package, written by the server at a path or handed back for download. */
    exportAnkiPackage: build.mutation<AnkiPackageExport, AnkiExportArgs>({
      queryFn: (args, api, _extraOptions, baseQuery) =>
        exportAnkiPackage(args, {
          server: serverQueryOf(baseQuery),
          serverFetch: (api.extra as BackendThunkExtra).serverFetch,
          signal: api.signal,
        }),
      invalidatesTags: (_result, _error, { projectId }) =>
        flashcardsSentTags(projectId),
    }),
    /** Records the delivery of a package the server wrote at a staging path, once the user has kept a copy of it. */
    recordAnkiExported: build.mutation<void, AnkiExportedArgs>({
      query: ({ projectId, flashcardIds, marksExported, readAtMs }) => ({
        method: "POST",
        path: `/projects/${projectId}/anki/exported`,
        body: {
          kind: "json",
          value: {
            flashcard_ids: [...flashcardIds],
            marks_exported: marksExported,
            read_at_ms: readAtMs,
          } satisfies AnkiExportedRequest,
        },
      }),
      invalidatesTags: (_result, _error, { projectId }) =>
        flashcardsSentTags(projectId),
    }),
    /**
     * Turns AnkiConnect on or off for a project. The project it answers replaces the cached one at once,
     * so that what follows the change, such as a send to Anki, sees it before the refetch lands.
     */
    setAnkiConnect: build.mutation<Project, AnkiConnectArgs>({
      query: ({ projectId, usesAnkiConnect }) => ({
        method: "PUT",
        path: `/projects/${projectId}/anki-connect`,
        body: {
          kind: "json",
          value: {
            uses_anki_connect: usesAnkiConnect,
          } satisfies AnkiConnectSetting,
        },
      }),
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result !== null)
          dispatch(
            backendApi.util.upsertQueryEntries([
              {
                endpointName: "getProject",
                arg: projectId,
                value: result.data,
              },
            ]),
          );
      },
      invalidatesTags: ["Projects"],
    }),
    /** The open-source license notices. They are megabytes of text, so the entry goes as soon as no page shows them. */
    licenseNotices: build.query<LicenseNoticeGroup[], void>({
      queryFn: () => loadLicenseNotices(loadLicenseNoticeGroups),
      keepUnusedDataFor: 0,
    }),
    /** Imports a picked dictionary file. The server answers with a job, which is polled through `getImportJob`. */
    importDictionary: build.mutation<
      ImportJobStarted,
      ImportPickedDictionaryArgs
    >({
      queryFn: (args, api, _extraOptions, baseQuery) =>
        importPickedDictionary(args, api.extra as BackendThunkExtra, baseQuery),
    }),
    /** Reads the first rows of a picked table and the columns detected in it. */
    previewDictionaryTable: build.mutation<
      TablePreview,
      { file: PickedDictionaryFile }
    >({
      queryFn: (args, api, _extraOptions, baseQuery) =>
        previewPickedDictionaryTable(
          args,
          api.extra as BackendThunkExtra,
          baseQuery,
        ),
    }),
    getImportJob: build.query<ImportJobStatus, string>({
      query: (id) => ({
        method: "GET",
        path: `/dictionaries/imports/${encodeURIComponent(id)}`,
        offlineOperation: { kind: "importJobStatus", id },
      }),
      /** Once the import is done, the list of dictionaries and the lookups that read them are stale. */
      async onQueryStarted(_id, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (data?.state === "done")
          dispatch(backendApi.util.invalidateTags(["Dictionaries"]));
      },
    }),
    listDictionaries: build.query<ListDictionariesResponse, void>({
      query: () => ({ method: "GET", path: "/dictionaries" }),
      providesTags: ["Dictionaries"],
    }),
    deleteDictionary: build.mutation<void, string>({
      query: (id) => ({
        method: "DELETE",
        path: `/dictionaries/${encodeURIComponent(id)}`,
      }),
      /** The removed dictionary leaves the list at once, rather than when the list is fetched again. */
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const isRemoved = await queryFulfilled.then(
          () => true,
          () => false,
        );
        if (isRemoved)
          dispatch(
            backendApi.util.updateQueryData(
              "listDictionaries",
              undefined,
              (list) => {
                list.dictionaries = list.dictionaries.filter(
                  (dictionary) => dictionary.id !== id,
                );
              },
            ),
          );
      },
      invalidatesTags: ["Dictionaries"],
    }),
    lookupText: build.query<LookupResponse, LookupQuery>({
      // A lookup whose context a batch is fetching waits for that batch rather than asking the server a second time.
      queryFn: async (lookup, api, _extraOptions, baseQuery) =>
        (await answerFromRunningBatch(api, lookup)) ??
        (baseQuery({
          method: "GET",
          path: "/dictionaries/lookup",
          query: {
            text: lookup.text,
            language: lookup.language,
            ...lookupContextQuery(lookup.context, lookup.offset),
          },
        }) as Promise<
          QueryReturnValue<LookupResponse, BackendError, undefined>
        >),
      providesTags: ["Dictionaries"],
      keepUnusedDataFor: lookupCacheSeconds,
    }),
    /** Looks up every position of several texts at once. `prefetchLookups` copies the answer into the cache of `lookupText`. */
    lookupTexts: build.query<BatchLookupResponse, BatchLookupRequest>({
      query: (request) => ({
        method: "POST",
        path: "/dictionaries/lookup/batch",
        body: { kind: "json", value: request },
      }),
      keepUnusedDataFor: 0,
    }),
    /** What the server that `via` names offers for signing in. The route needs no token. */
    getServerAuthInfo: build.query<ServerAuthInfo, AccountVia>({
      query: (via) => ({
        method: "GET",
        path: accountPath(via, "/auth/server"),
      }),
    }),
    /** The library's items: the published ones, or every item for a library manager. */
    listLibraryItems: build.query<LibraryListing, void>({
      query: () => ({ method: "GET", path: "/library/items" }),
      providesTags: (result) => [
        libraryListTag,
        ...(result?.items ?? []).map(({ id }) => libraryItemTag(id)),
      ],
    }),
    /** One item of the library, fetched again every two seconds while it is being prepared for publishing, after which its listing and text are fetched again. */
    getLibraryItem: build.query<LibraryItem, string>({
      query: (itemId) => ({ method: "GET", path: libraryItemPath(itemId) }),
      providesTags: (_result, _error, itemId) => [libraryItemTag(itemId)],
      async onQueryStarted(
        itemId,
        { dispatch, getCacheEntry, queryFulfilled },
      ) {
        await followLibraryItemFetch(
          { getCacheEntry, queryFulfilled },
          () =>
            dispatch(
              backendApi.endpoints.getLibraryItem.initiate(itemId, {
                subscribe: false,
                forceRefetch: true,
              }),
            ),
          // Publishing fills in the screenshot times of the text, and the listing shows the new status.
          () =>
            dispatch(
              backendApi.util.invalidateTags([
                libraryListTag,
                libraryTextTag(itemId),
              ]),
            ),
        );
      },
    }),
    /** The subtitle cues or paragraphs of a library item, with the words the library manager set. */
    getLibraryText: build.query<LibraryText, string>({
      query: (itemId) => ({
        method: "GET",
        path: `${libraryItemPath(itemId)}/text`,
      }),
      providesTags: (_result, _error, itemId) => [libraryTextTag(itemId)],
    }),
    /** Adds a library item to a project, or to a project made for it when `projectId` is null. Adding it again returns the same media file. */
    addLibraryItem: build.mutation<LibraryItemAdded, AddLibraryItemArgs>({
      query: ({ itemId, projectId }) => ({
        method: "POST",
        path: `${libraryItemPath(itemId)}/add`,
        body: { kind: "json", value: { project_id: projectId } },
      }),
      invalidatesTags: (result) =>
        result ? mediaFileAddedTags(result.project_id) : [],
    }),
    /** Makes a flashcard from a word or a segment of a library media file, which the server fills from the item's text. */
    createLibraryFlashcard: build.mutation<Flashcard, LibraryFlashcardArgs>({
      query: ({ card, ...file }) => ({
        method: "POST",
        path: `${mediaFilePath(file)}/library-flashcards`,
        body: { kind: "json", value: card },
      }),
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        await listSavedFlashcard(dispatch, projectId, queryFulfilled);
      },
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Flashcards", id: projectId },
        { type: "AnkiPendingDeletions", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
        { type: "Review", id: projectId },
      ],
    }),
    /** Creates a draft item of the library. */
    createLibraryItem: build.mutation<LibraryItem, LibraryItemDraft>({
      query: (draft) => ({
        method: "POST",
        path: "/library/items",
        body: { kind: "json", value: draft },
      }),
      async onQueryStarted(_draft, { dispatch, queryFulfilled }) {
        await cacheLibraryItem(dispatch, queryFulfilled);
      },
      invalidatesTags: [libraryListTag],
    }),
    /** Changes the title, description, languages, kind, difficulty, tags or cover time of a library item. */
    updateLibraryItem: build.mutation<LibraryItem, LibraryItemArgs>({
      query: ({ itemId, draft }) => ({
        method: "PUT",
        path: libraryItemPath(itemId),
        body: { kind: "json", value: draft },
      }),
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        await cacheLibraryItem(dispatch, queryFulfilled);
      },
      invalidatesTags: [libraryListTag],
    }),
    deleteLibraryItem: build.mutation<void, string>({
      query: (itemId) => ({ method: "DELETE", path: libraryItemPath(itemId) }),
      invalidatesTags: [libraryListTag],
    }),
    /** Uploads the media or text file of a library item, which a browser holds. A text file's paragraphs become the item's text. */
    uploadLibraryFile: build.mutation<LibraryItem, LibraryFileUploadArgs>({
      queryFn: (args, api, _options, baseQuery) =>
        uploadLibraryFile(args, api.extra as BackendThunkExtra, baseQuery),
      invalidatesTags: (_result, _error, { itemId }) => [
        libraryListTag,
        libraryItemTag(itemId),
        libraryTextTag(itemId),
      ],
    }),
    /** Replaces a video or audio item's segments with the cues of its subtitles, each paired with the translation cue that overlaps it most. */
    putLibrarySubtitles: build.mutation<LibraryText, LibrarySubtitlesArgs>({
      query: ({ itemId, subtitles }) => ({
        method: "PUT",
        path: `${libraryItemPath(itemId)}/subtitles`,
        body: { kind: "json", value: subtitles },
      }),
      async onQueryStarted({ itemId }, { dispatch, queryFulfilled }) {
        await cacheLibraryText(dispatch, itemId, queryFulfilled);
      },
      invalidatesTags: (_result, _error, { itemId }) => [
        libraryListTag,
        libraryItemTag(itemId),
      ],
    }),
    /** Fills the segments that have no words yet with words from the library manager's own dictionaries. */
    proposeLibraryWords: build.mutation<LibraryText, string>({
      query: (itemId) => ({
        method: "POST",
        path: `${libraryItemPath(itemId)}/proposed-words`,
      }),
      async onQueryStarted(itemId, { dispatch, queryFulfilled }) {
        await cacheLibraryText(dispatch, itemId, queryFulfilled);
      },
    }),
    /** Gives one entry to every word of an item written as `apply.word_text` says, in every segment. */
    applyLibraryEntry: build.mutation<LibraryText, ApplyLibraryEntryArgs>({
      query: ({ itemId, apply }) => ({
        method: "POST",
        path: `${libraryItemPath(itemId)}/apply-entry`,
        body: { kind: "json", value: apply },
      }),
      async onQueryStarted({ itemId }, { dispatch, queryFulfilled }) {
        await cacheLibraryText(dispatch, itemId, queryFulfilled);
      },
      invalidatesTags: (_result, _error, { itemId }) => [
        libraryTextTag(itemId),
      ],
    }),
    /** Sets the words of one segment, with the entry of each. */
    putLibraryWords: build.mutation<LibrarySegment, LibraryWordsArgs>({
      query: ({ itemId, segmentIndex, words }) => ({
        method: "PUT",
        path: `${libraryItemPath(itemId)}/segments/${segmentIndex}/words`,
        body: { kind: "json", value: words },
      }),
      async onQueryStarted({ itemId }, { dispatch, queryFulfilled }) {
        await cacheLibrarySegment(dispatch, itemId, queryFulfilled);
      },
    }),
    /** Starts preparing a library item's clips, screenshots and cover. The item shows as processing until they are ready. */
    publishLibraryItem: build.mutation<LibraryItem, string>({
      query: (itemId) => ({
        method: "POST",
        path: `${libraryItemPath(itemId)}/publish`,
      }),
      async onQueryStarted(_itemId, { dispatch, queryFulfilled }) {
        await cacheLibraryItem(dispatch, queryFulfilled);
      },
      invalidatesTags: [libraryListTag],
    }),
    /** Hides a library item from learners again, as a draft. */
    unpublishLibraryItem: build.mutation<LibraryItem, string>({
      query: (itemId) => ({
        method: "POST",
        path: `${libraryItemPath(itemId)}/unpublish`,
      }),
      async onQueryStarted(_itemId, { dispatch, queryFulfilled }) {
        await cacheLibraryItem(dispatch, queryFulfilled);
      },
      invalidatesTags: [libraryListTag],
    }),
    /** Who the token used on the server that `via` names belongs to: the owner of the machine the server runs on, or an account. */
    getCurrentPrincipal: build.query<CurrentPrincipal, AccountVia>({
      query: (via) => ({ method: "GET", path: accountPath(via, "/auth/me") }),
      providesTags: ["CurrentPrincipal"],
    }),
    /** Ends the session the app's token belongs to. */
    logOut: build.mutation<void, void>({
      query: () => ({ method: "POST", path: "/auth/logout" }),
    }),
    /** The accounts of the server that `via` names, which only an administrator may list. */
    listUsers: build.query<AccountUser[], AccountVia>({
      query: (via) => ({ method: "GET", path: accountPath(via, "/users") }),
      providesTags: ["Users"],
    }),
    createUser: build.mutation<AccountUser, CreateUserArgs>({
      query: ({ via, request }) => ({
        method: "POST",
        path: accountPath(via, "/users"),
        body: { kind: "json", value: request },
      }),
      invalidatesTags: ["Users"],
    }),
    setUserRole: build.mutation<AccountUser, UserRoleArgs>({
      query: ({ via, userId, body }) => ({
        method: "PUT",
        path: accountPath(via, `/users/${encodeURIComponent(userId)}/role`),
        body: { kind: "json", value: body },
      }),
      // The account may be the app's own, whose role the account settings screen shows.
      invalidatesTags: ["Users", "CurrentPrincipal"],
    }),
    /** Lets an account manage the library, or stops it, as only an administrator may. */
    setLibraryManager: build.mutation<AccountUser, LibraryManagerArgs>({
      query: ({ userId, managesLibrary }) => ({
        method: "PUT",
        path: `/users/${encodeURIComponent(userId)}/library-manager`,
        body: {
          kind: "json",
          value: {
            manages_library: managesLibrary,
          } satisfies SetLibraryManager,
        },
      }),
      // The account may be the app's own, whose "Manage library" button depends on it.
      invalidatesTags: ["Users", "CurrentPrincipal"],
    }),
    deleteUser: build.mutation<void, UserArgs>({
      query: ({ via, userId }) => ({
        method: "DELETE",
        path: accountPath(via, `/users/${encodeURIComponent(userId)}`),
      }),
      // The account may be the app's own, whose session then ends.
      invalidatesTags: ["Users", "CurrentPrincipal"],
    }),
    /**
     * Reads the pairing code to show to another device on the local network.
     * The server issues a new one when the last one was used or is about to expire, so polling this keeps a working code on screen.
     */
    currentPairingCode: build.query<PairingCode, void>({
      query: () => ({ method: "POST", path: "/pairing/code/current" }),
      providesTags: ["PairingCode"],
    }),
    /** Issues a new pairing code, replacing the one on screen. */
    issuePairingCode: build.mutation<PairingCode, void>({
      query: () => ({ method: "POST", path: "/pairing/code" }),
      invalidatesTags: ["PairingCode"],
    }),
    /** The devices the account is logged in on, which only an account may list. */
    listSessions: build.query<SessionList, AccountVia>({
      query: (via) => ({
        method: "GET",
        path: accountPath(via, "/auth/sessions"),
      }),
      providesTags: ["Sessions"],
    }),
    /** Logs the account out on one of its devices. */
    deleteSession: build.mutation<void, SessionArgs>({
      query: ({ via, sessionId }) => ({
        method: "DELETE",
        path: accountPath(
          via,
          `/auth/sessions/${encodeURIComponent(sessionId)}`,
        ),
      }),
      // A session that is already gone fails, and the list is then out of date as well.
      invalidatesTags: () => ["Sessions"],
    }),
    /** Mails the account another link that confirms its email address. */
    requestConfirmationEmail: build.mutation<void, AccountVia>({
      query: (via) => ({
        method: "POST",
        path: accountPath(via, "/auth/confirmation-email"),
      }),
    }),
    /**
     * How the native app's built-in server keeps a copy of its data on the remote it is linked to.
     * Each answer is compared with the one before it: changes pulled from the remote make the data they may touch stale and reload the preferences that follow the person,
     * changes pushed to it change which projects are backed up, and a new latest conflict is reported to the person.
     * The first answer has nothing to compare with, so it reports nothing; the entry is kept while nothing shows it, so that the next answer still has one.
     */
    getSyncStatus: build.query<SyncStatus, void>({
      query: () => ({ method: "GET", path: "/sync/status" }),
      providesTags: ["SyncStatus"],
      keepUnusedDataFor: Infinity,
      async onQueryStarted(_arg, { dispatch, getCacheEntry, queryFulfilled }) {
        const before = getCacheEntry().data;
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (before === undefined || data === null) return;
        const staleTags = staleTagsBetween(before, data);
        if (staleTags.length > 0)
          dispatch(backendApi.util.invalidateTags([...staleTags]));
        if (data.pulled_revision !== before.pulled_revision)
          dispatch(actions.syncPulledChanges());
        const latestConflictId = data.link?.conflicts[0]?.id;
        if (latestConflictId === before.link?.conflicts[0]?.id) return;
        dispatch(backendApi.util.invalidateTags(["SyncConflicts"]));
        if (latestConflictId !== undefined)
          dispatch(actions.syncConflictsReported(latestConflictId));
      },
    }),
    /** Every conflict the built-in server recorded, where the status lists only the most recent. */
    listSyncConflicts: build.query<ListSyncConflictsResponse, void>({
      query: () => ({ method: "GET", path: "/sync/conflicts" }),
      providesTags: ["SyncConflicts"],
    }),
    /** Logs the built-in server in to a remote, or signs up there, to keep a copy of the device's data on it. */
    linkSyncRemote: build.mutation<SyncStatus, LinkRemoteRequest>({
      query: (request) => ({
        method: "POST",
        path: "/sync/link",
        body: { kind: "json", value: request },
      }),
      invalidatesTags: [...linkChangedTags],
    }),
    /** Logs the built-in server out of its remote. The data on the device stays. */
    unlinkSyncRemote: build.mutation<void, void>({
      query: () => ({ method: "DELETE", path: "/sync/link" }),
      invalidatesTags: [...linkChangedTags],
    }),
    /** Asks the built-in server to sync with its remote now. The status then shows the round. */
    runSync: build.mutation<void, void>({
      query: () => ({ method: "POST", path: "/sync/run" }),
      invalidatesTags: ["SyncStatus"],
    }),
    /** Forgets the conflicts the built-in server recorded while syncing. */
    dismissSyncConflicts: build.mutation<void, void>({
      query: () => ({ method: "DELETE", path: "/sync/conflicts" }),
      invalidatesTags: ["SyncStatus", "SyncConflicts"],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useGetProjectQuery,
  useListFlashcardsQuery,
  useCreateFlashcardMutation,
  useUpdateFlashcardMutation,
  useDeleteFlashcardMutation,
  useListMediaFilesQuery,
  useGetMediaAvailabilityQuery,
  useListPluginsQuery,
  useGetMediaTracksQuery,
  useChoosePlaybackMethodQuery,
  useListEmbeddedSubtitleTracksQuery,
  useListSubtitleTracksQuery,
  useGetSubtitleCuesQuery,
  useListAlignmentsQuery,
  useAddAlignmentMutation,
  useRemoveAlignmentMutation,
  useSetTranslationDocumentMutation,
  useGetConversionCacheStatusQuery,
  useGetConversionCapabilitiesQuery,
  useOpenBookQuery,
  useLicenseNoticesQuery,
  useProbePicturesQuery,
  useCaptureFrameQuery,
  useListDictionariesQuery,
  useLookupTextQuery,
  useLazyLookupTextQuery,
  useListAnkiPendingDeletionsQuery,
  useGetCurrentPrincipalQuery,
  useGetServerAuthInfoQuery,
  useListUsersQuery,
  useListSessionsQuery,
  useGetSyncStatusQuery,
  useListSyncConflictsQuery,
  useGetStorageStatusQuery,
  useGetReviewSummaryQuery,
  useListReviewCountsQuery,
  useCurrentPairingCodeQuery,
  useIssuePairingCodeMutation,
  useListLibraryItemsQuery,
  useGetLibraryItemQuery,
  useGetLibraryTextQuery,
  useAddLibraryItemMutation,
  useCreateLibraryItemMutation,
  useUpdateLibraryItemMutation,
  useDeleteLibraryItemMutation,
  useUploadLibraryFileMutation,
  usePutLibrarySubtitlesMutation,
  useProposeLibraryWordsMutation,
  useApplyLibraryEntryMutation,
  usePutLibraryWordsMutation,
  usePublishLibraryItemMutation,
  useUnpublishLibraryItemMutation,
  useSetLibraryManagerMutation,
} = backendApi;

type BackendState = Parameters<
  typeof backendApi.util.selectCachedArgsForQuery
>[0];

/** The cached answer of a lookup, or undefined when none is cached, for reading the cache at once rather than through a hook. */
export function selectCachedLookup(
  state: unknown,
  query: LookupQuery,
): LookupResponse | undefined {
  const entry = backendApi.endpoints.lookupText.select(query)(
    state as BackendState,
  );
  return entry.isSuccess ? entry.data : undefined;
}

/** The cached peaks window of a media file from one time to another, or undefined when none is cached. */
export function selectCachedWaveformWindow(
  state: unknown,
  window: WaveformWindowArgs,
): WaveformResponse | undefined {
  const entry = backendApi.endpoints.getWaveformWindow.select(window)(
    state as BackendState,
  );
  return entry.isSuccess ? entry.data : undefined;
}

/** The API's internal subscription actions, typed apart so that the endpoints that read them do not make `backendApi`'s type refer to itself. */
function subscriptionActions(): SubscriptionActions {
  return backendApi.internalActions;
}

/** Whether the cache holds the answer of the pictures probe of a file the browser holds. */
export function hasProbedPictures(state: unknown, file: PickedFile): boolean {
  return backendApi.endpoints.probePictures.select(file)(state as BackendState)
    .isSuccess;
}

/** The batch lookups being fetched now. */
export function selectRunningBatches(
  state: BackendState,
): BatchLookupRequest[] {
  return backendApi.util
    .selectCachedArgsForQuery(state, "lookupTexts")
    .filter(
      (request) =>
        backendApi.endpoints.lookupTexts.select(request)(state).isLoading,
    );
}

/**
 * Answers a lookup from a batch being fetched that covers its context and looks up its position, once the batch answers;
 * or null when none does or the batch fails.
 */
async function answerFromRunningBatch(
  api: BaseQueryApi,
  lookup: LookupQuery,
): Promise<{ data: LookupResponse } | null> {
  const { context, offset } = lookup;
  const isInReach = lookupsInBatchReach([lookup]).length > 0;
  if (context === undefined || offset === undefined || !isInReach) return null;
  const batch = selectRunningBatches(api.getState() as BackendState).find(
    (request) =>
      request.language === lookup.language && request.texts.includes(context),
  );
  const running =
    batch &&
    api.dispatch(backendApi.util.getRunningQueryThunk("lookupTexts", batch));
  const answer = running && (await running).data;
  const data =
    answer &&
    batch &&
    lookupResponseAt(batch, answer, batch.texts.indexOf(context), offset);
  return data ? { data } : null;
}
