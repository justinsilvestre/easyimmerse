import {
  type LicenseNoticeGroup,
  loadLicenseNoticeGroups,
} from "@easyimmerse/licenses";
import type { PickedDictionaryFile } from "@easyimmerse/state";
import type {
  AddMediaFileRequest,
  AddSubtitleTrackRequest,
  BatchLookupRequest,
  BatchLookupResponse,
  ConversionCacheBudget,
  ConversionCacheStatus,
  Document,
  EmbeddedSubtitleTracksResponse,
  Flashcard,
  FlashcardDraft,
  ImportFormRequest,
  ImportJobStarted,
  ImportJobStatus,
  ImportStepRequest,
  ImportStepResponse,
  ListDictionariesResponse,
  ListFlashcardsResponse,
  ListMediaFilesResponse,
  ListPluginsResponse,
  ListProjectsResponse,
  LookupQuery,
  LookupResponse,
  MediaFile,
  MediaSourceJob,
  NewFlashcard,
  ParseTimedTextRequest,
  PlaybackRequest,
  PlaybackResponse,
  PluginForm,
  Project,
  ProjectSettings,
  SourceStepRequest,
  SourceStepResponse,
  SubtitleSelection,
  SubtitleTrack,
  SubtitleTracksResponse,
  TablePreview,
  TimedTextTrack,
  TrackSelection,
  TracksResponse,
  WaveformResponse,
} from "@easyimmerse/types";
import type { BaseQueryApi, QueryReturnValue } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { BackendError } from "./backendClient.ts";
import {
  type CapturedFrame,
  captureFrame,
  type FrameArgs,
  probePictures,
} from "./browserFrames.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { injectedBaseQuery } from "./injectedBaseQuery.ts";
import {
  isQuerySubscribed,
  type SubscriptionActions,
} from "./isQuerySubscribed.ts";
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

type ProjectArgs = { projectId: string; settings: ProjectSettings };

type FlashcardArgs = { projectId: string; flashcardId: string };

type AddMediaFileArgs = { projectId: string; request: AddMediaFileRequest };

type ImportFormArgs = { projectId: string; request: ImportFormRequest };

type ImportStepArgs = { projectId: string; request: ImportStepRequest };

type MediaSourceJobArgs = { projectId: string; jobId: string };

type SourceStepArgs = MediaFileArgs & { request: SourceStepRequest };

type MediaFileArgs = { projectId: string; mediaFileId: string };

type PlanPlaybackArgs = MediaFileArgs & { request: PlaybackRequest };

type SaveTrackSelectionArgs = MediaFileArgs & { selection: TrackSelection };

type WaveformWindowArgs = MediaFileArgs & { startMs: number; endMs: number };

type AddSubtitleTrackArgs = MediaFileArgs & {
  request: AddSubtitleTrackRequest;
};

type SubtitleTrackArgs = MediaFileArgs & { trackId: string };

type SubtitleSelectionArgs = MediaFileArgs & { selection: SubtitleSelection };

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

const mediaFileAddedTags = (projectId: string) =>
  [
    { type: "MediaFiles", id: projectId },
    { type: "Projects", id: projectId },
    "Projects",
  ] as const;

/** The server operations the app uses, one endpoint each. Bodies and paths follow the OpenAPI document. */
export const backendApi = createApi({
  reducerPath: "backend",
  baseQuery: injectedBaseQuery,
  tagTypes: [
    "Projects",
    "MediaFiles",
    "Flashcards",
    "SubtitleTracks",
    "Dictionaries",
    "ConversionCache",
  ],
  endpoints: (build) => ({
    listProjects: build.query<ListProjectsResponse, void>({
      query: () => ({ method: "GET", path: "/projects" }),
      providesTags: ["Projects"],
    }),
    getProject: build.query<Project, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}`,
      }),
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
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Flashcards", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
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
      // The list shows the change at once, so that a dragged clip does not jump back while the request runs.
      async onQueryStarted(
        { projectId, flashcardId, draft },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          backendApi.util.updateQueryData(
            "listFlashcards",
            projectId,
            (list) => {
              const flashcard = list.flashcards.find(
                ({ id }) => id === flashcardId,
              );
              if (flashcard) Object.assign(flashcard, draft);
            },
          ),
        );
        await queryFulfilled.catch(patch.undo);
      },
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Flashcards", id: projectId },
      ],
    }),
    deleteFlashcard: build.mutation<void, FlashcardArgs>({
      query: ({ projectId, flashcardId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/flashcards/${flashcardId}`,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Flashcards", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
      ],
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
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
        { type: "Flashcards", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
      ],
    }),
    getMediaTracks: build.query<TracksResponse, MediaFileArgs>({
      query: (args) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/tracks`,
      }),
    }),
    planPlayback: build.query<PlaybackResponse, PlanPlaybackArgs>({
      query: ({ request, ...args }) => ({
        method: "POST",
        path: `${mediaFilePath(args)}/playback`,
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
    getConversionCacheStatus: build.query<ConversionCacheStatus, void>({
      query: () => ({ method: "GET", path: "/conversion-cache" }),
      providesTags: ["ConversionCache"],
    }),
    clearConversionCache: build.mutation<ConversionCacheStatus, void>({
      query: () => ({ method: "POST", path: "/conversion-cache/clear" }),
      invalidatesTags: ["ConversionCache"],
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
      invalidatesTags: ["ConversionCache"],
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
  useListPluginsQuery,
  useGetMediaTracksQuery,
  usePlanPlaybackQuery,
  useListEmbeddedSubtitleTracksQuery,
  useListSubtitleTracksQuery,
  useGetSubtitleCuesQuery,
  useGetConversionCacheStatusQuery,
  useOpenBookQuery,
  useLicenseNoticesQuery,
  useProbePicturesQuery,
  useCaptureFrameQuery,
  useListDictionariesQuery,
  useLookupTextQuery,
  useLazyLookupTextQuery,
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

/** The tracks of a media file, from the cache, or undefined until they have loaded. */
/** The API's internal subscription actions, typed apart so that the endpoints that read them do not make `backendApi`'s type refer to itself. */
function subscriptionActions(): SubscriptionActions {
  return backendApi.internalActions;
}

/** Whether the cache holds the answer of the pictures probe of a file the browser holds. */
export function hasProbedPictures(state: unknown, file: PickedFile): boolean {
  return backendApi.endpoints.probePictures.select(file)(state as BackendState)
    .isSuccess;
}

export function selectCachedMediaTracks(
  state: unknown,
  file: MediaFileArgs,
): TracksResponse | undefined {
  const entry = backendApi.endpoints.getMediaTracks.select(file)(
    state as BackendState,
  );
  return entry.isSuccess ? entry.data : undefined;
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
