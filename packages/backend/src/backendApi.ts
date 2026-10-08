import type {
  AddMediaFileRequest,
  AddSubtitleTrackRequest,
  BatchLookupRequest,
  BatchLookupResponse,
  ConversionCacheBudget,
  ConversionCacheStatus,
  Document,
  DocumentFormat,
  EmbeddedSubtitleTracksResponse,
  Flashcard,
  FlashcardDraft,
  ImportJobStarted,
  ImportJobStatus,
  ImportLocalDictionaryRequest,
  ListDictionariesResponse,
  ListFlashcardsResponse,
  ListMediaFilesResponse,
  ListProjectsResponse,
  LookupQuery,
  LookupResponse,
  MediaFile,
  NewFlashcard,
  ParseLocalDocumentRequest,
  ParseTimedTextRequest,
  PlaybackRequest,
  PlaybackResponse,
  PreviewLocalDictionaryTableRequest,
  Project,
  ProjectSettings,
  SubtitleSelection,
  SubtitleTrack,
  SubtitleTracksResponse,
  TableLayout,
  TablePreview,
  TimedTextTrack,
  TrackSelection,
  TracksResponse,
  WaveformResponse,
} from "@easyimmerse/types";
import type { BaseQueryApi, QueryReturnValue } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { BackendError } from "./backendClient.ts";
import { injectedBaseQuery } from "./injectedBaseQuery.ts";
import { lookupsInBatchReach } from "./lookupBatches.ts";
import { lookupResponseAt } from "./lookupResponseAt.ts";

type ParseDocumentArgs = {
  bytes: Uint8Array | Blob;
  format: DocumentFormat | null;
  contentType: string;
};

type ImportDictionaryArgs = {
  fileName: string;
  bytes: Uint8Array | Blob;
  /** Replaces the detected layout of a CSV, TSV or Tabfile table. */
  tableLayout?: TableLayout | null;
};

type PreviewDictionaryTableArgs = {
  fileName: string;
  bytes: Uint8Array | Blob;
};

type ProjectArgs = { projectId: string; settings: ProjectSettings };

type FlashcardArgs = { projectId: string; flashcardId: string };

type AddMediaFileArgs = { projectId: string; request: AddMediaFileRequest };

type MediaFileArgs = { projectId: string; mediaFileId: string };

type PlanPlaybackArgs = MediaFileArgs & { request: PlaybackRequest };

type SaveTrackSelectionArgs = MediaFileArgs & { selection: TrackSelection };

type WaveformWindowArgs = MediaFileArgs & { startMs: number; endMs: number };

type AddSubtitleTrackArgs = MediaFileArgs & {
  request: AddSubtitleTrackRequest;
};

type SubtitleTrackArgs = MediaFileArgs & { trackId: string };

type SubtitleSelectionArgs = MediaFileArgs & { selection: SubtitleSelection };

/** Encodes a table layout as the `columns` and `hasHeader` query parameters of an import. */
const tableLayoutQuery = (
  layout: TableLayout | null,
): Record<string, string> =>
  layout === null
    ? {}
    : {
        columns: layout.columns.join(","),
        hasHeader: String(layout.hasHeader),
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
      // The new file's entry decides which screen opens it, so it joins the list at once.
      // The refetch that the invalidation starts can wait for other requests to finish.
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        const result = await queryFulfilled.catch(() => null);
        if (result === null) return;
        const added = result.data;
        dispatch(
          backendApi.util.updateQueryData(
            "listMediaFiles",
            projectId,
            (list) => {
              if (!list.media_files.some(({ id }) => id === added.id))
                list.media_files.push(added);
            },
          ),
        );
      },
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
        { type: "Projects", id: projectId },
        "Projects",
      ],
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
    getWaveformWindow: build.query<WaveformResponse, WaveformWindowArgs>({
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
    parseDocument: build.mutation<Document, ParseDocumentArgs>({
      query: ({ bytes, format, contentType }) => ({
        method: "POST",
        path: "/documents/parse",
        query: format === null ? undefined : { format },
        body: { kind: "bytes", value: bytes, contentType },
        offlineOperation:
          bytes instanceof Uint8Array
            ? { kind: "parseDocument", bytes, format }
            : undefined,
      }),
    }),
    parseLocalDocument: build.mutation<Document, ParseLocalDocumentRequest>({
      query: (request) => ({
        method: "POST",
        path: "/documents/parse-local",
        body: { kind: "json", value: request },
      }),
    }),
    importDictionary: build.mutation<ImportJobStarted, ImportDictionaryArgs>({
      query: ({ fileName, bytes, tableLayout = null }) => ({
        method: "POST",
        path: "/dictionaries",
        query: { fileName, ...tableLayoutQuery(tableLayout) },
        body: {
          kind: "bytes",
          value: bytes,
          contentType: "application/octet-stream",
        },
        offlineOperation:
          bytes instanceof Uint8Array
            ? { kind: "importDictionary", fileName, bytes, tableLayout }
            : undefined,
      }),
    }),
    previewDictionaryTable: build.mutation<
      TablePreview,
      PreviewDictionaryTableArgs
    >({
      query: ({ fileName, bytes }) => ({
        method: "POST",
        path: "/dictionaries/preview",
        query: { fileName },
        body: {
          kind: "bytes",
          value: bytes,
          contentType: "application/octet-stream",
        },
        offlineOperation:
          bytes instanceof Uint8Array
            ? { kind: "previewDictionaryTable", fileName, bytes }
            : undefined,
      }),
    }),
    previewLocalDictionaryTable: build.mutation<
      TablePreview,
      PreviewLocalDictionaryTableRequest
    >({
      query: (request) => ({
        method: "POST",
        path: "/dictionaries/preview-local",
        body: { kind: "json", value: request },
      }),
    }),
    importLocalDictionary: build.mutation<
      ImportJobStarted,
      ImportLocalDictionaryRequest
    >({
      query: (request) => ({
        method: "POST",
        path: "/dictionaries/import-local",
        body: { kind: "json", value: request },
      }),
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
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useMarkProjectOpenedMutation,
  useListFlashcardsQuery,
  useCreateFlashcardMutation,
  useUpdateFlashcardMutation,
  useDeleteFlashcardMutation,
  useListMediaFilesQuery,
  useAddMediaFileMutation,
  useRemoveMediaFileMutation,
  useGetMediaTracksQuery,
  usePlanPlaybackQuery,
  useSaveTrackSelectionMutation,
  useLazyGetWaveformWindowQuery,
  useListEmbeddedSubtitleTracksQuery,
  useListSubtitleTracksQuery,
  useAddSubtitleTrackMutation,
  useGetSubtitleCuesQuery,
  useSetSubtitleSelectionMutation,
  useGetConversionCacheStatusQuery,
  useClearConversionCacheMutation,
  useSetConversionCacheBudgetMutation,
  useParseTimedTextMutation,
  useParseDocumentMutation,
  useParseLocalDocumentMutation,
  useImportDictionaryMutation,
  usePreviewDictionaryTableMutation,
  usePreviewLocalDictionaryTableMutation,
  useImportLocalDictionaryMutation,
  useGetImportJobQuery,
  useListDictionariesQuery,
  useDeleteDictionaryMutation,
  useLookupTextQuery,
  useLazyLookupTextQuery,
} = backendApi;

type BackendState = Parameters<
  typeof backendApi.util.selectCachedArgsForQuery
>[0];

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
