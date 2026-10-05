import type {
  AddMediaFileRequest,
  ConversionCacheStatus,
  DictionarySummary,
  Document,
  DocumentFormat,
  ImportLocalDictionaryRequest,
  ListDictionariesResponse,
  ListMediaFilesResponse,
  ListProjectsResponse,
  LookupQuery,
  LookupResponse,
  MediaFile,
  ParseLocalDocumentRequest,
  ParseTimedTextRequest,
  PlaybackRequest,
  PlaybackResponse,
  PreferenceValue,
  SubtitleTracksResponse,
  TableLayout,
  TablePreview,
  TimedTextTrack,
  TrackSelection,
  TracksResponse,
  WaveformResponse,
} from "@easyimmerse/types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { injectedBaseQuery } from "./injectedBaseQuery.ts";

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

type AddMediaFileArgs = { projectId: string; request: AddMediaFileRequest };

type MediaFileArgs = { projectId: string; mediaFileId: string };

type PlanPlaybackArgs = MediaFileArgs & { request: PlaybackRequest };

type SaveTrackSelectionArgs = MediaFileArgs & { selection: TrackSelection };

type WaveformWindowArgs = MediaFileArgs & { startMs: number; endMs: number };

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

const mediaFilePath = ({ projectId, mediaFileId }: MediaFileArgs) =>
  `/projects/${projectId}/media/${mediaFileId}`;

/** Every server operation, one endpoint each. Bodies and paths follow the OpenAPI document. */
export const backendApi = createApi({
  reducerPath: "backend",
  baseQuery: injectedBaseQuery,
  tagTypes: [
    "Projects",
    "MediaFiles",
    "Preferences",
    "Dictionaries",
    "ConversionCache",
  ],
  endpoints: (build) => ({
    listProjects: build.query<ListProjectsResponse, void>({
      query: () => ({ method: "GET", path: "/projects" }),
      providesTags: ["Projects"],
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
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
      ],
    }),
    removeMediaFile: build.mutation<void, MediaFileArgs>({
      query: ({ projectId, mediaFileId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/media/${mediaFileId}`,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
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
    clearTrackSelection: build.mutation<void, MediaFileArgs>({
      query: (args) => ({
        method: "DELETE",
        path: `${mediaFilePath(args)}/track-selection`,
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
    listSubtitleTracks: build.query<SubtitleTracksResponse, MediaFileArgs>({
      query: (args) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/subtitle-tracks`,
      }),
    }),
    getConversionCacheStatus: build.query<ConversionCacheStatus, void>({
      query: () => ({ method: "GET", path: "/conversion-cache" }),
      providesTags: ["ConversionCache"],
    }),
    clearConversionCache: build.mutation<ConversionCacheStatus, void>({
      query: () => ({ method: "POST", path: "/conversion-cache/clear" }),
      invalidatesTags: ["ConversionCache"],
    }),
    getPreference: build.query<PreferenceValue, string>({
      query: (key) => ({ method: "GET", path: `/preferences/${key}` }),
      providesTags: (_result, _error, key) => [
        { type: "Preferences", id: key },
      ],
    }),
    setPreference: build.mutation<void, { key: string; value: string | null }>({
      query: ({ key, value }) => ({
        method: "PUT",
        path: `/preferences/${key}`,
        body: { kind: "json", value: { value } satisfies PreferenceValue },
      }),
      invalidatesTags: (_result, _error, { key }) => [
        { type: "Preferences", id: key },
      ],
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
    importDictionary: build.mutation<DictionarySummary, ImportDictionaryArgs>({
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
            ? { kind: "parseDictionary", fileName, bytes, tableLayout }
            : undefined,
      }),
      invalidatesTags: ["Dictionaries"],
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
    importLocalDictionary: build.mutation<
      DictionarySummary,
      ImportLocalDictionaryRequest
    >({
      query: (request) => ({
        method: "POST",
        path: "/dictionaries/import-local",
        body: { kind: "json", value: request },
      }),
      invalidatesTags: ["Dictionaries"],
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
      query: ({ text, language, context, offset }) => ({
        method: "GET",
        path: "/dictionaries/lookup",
        query: { text, language, ...lookupContextQuery(context, offset) },
      }),
      providesTags: ["Dictionaries"],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useListMediaFilesQuery,
  useAddMediaFileMutation,
  useRemoveMediaFileMutation,
  useGetMediaTracksQuery,
  usePlanPlaybackQuery,
  useSaveTrackSelectionMutation,
  useClearTrackSelectionMutation,
  useLazyGetWaveformWindowQuery,
  useListSubtitleTracksQuery,
  useGetConversionCacheStatusQuery,
  useClearConversionCacheMutation,
  useGetPreferenceQuery,
  useSetPreferenceMutation,
  useParseTimedTextMutation,
  useParseDocumentMutation,
  useParseLocalDocumentMutation,
  useImportDictionaryMutation,
  usePreviewDictionaryTableMutation,
  useImportLocalDictionaryMutation,
  useListDictionariesQuery,
  useDeleteDictionaryMutation,
  useLookupTextQuery,
  useLazyLookupTextQuery,
} = backendApi;
