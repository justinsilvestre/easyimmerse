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
  LookupResponse,
  MediaFile,
  ParseLocalDocumentRequest,
  ParseTimedTextRequest,
  PlaybackRequest,
  PlaybackResponse,
  PreferenceValue,
  TimedTextTrack,
  TrackInfo,
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

type AddMediaFileArgs = { projectId: string; request: AddMediaFileRequest };

type MediaFileArgs = { projectId: string; mediaFileId: string };

type PlanPlaybackArgs = MediaFileArgs & { request: PlaybackRequest };

type SaveTrackSelectionArgs = MediaFileArgs & { selection: TrackSelection };

type WaveformWindowArgs = MediaFileArgs & { startMs: number; endMs: number };

/**
 * The subtitle tracks embedded in a media file.
 * The api crate defines this type; replace this declaration with the generated one once it is exported.
 */
export type SubtitleTracksResponse = { tracks: TrackInfo[] };

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
    importDictionary: build.mutation<DictionarySummary, { bytes: Uint8Array }>({
      query: ({ bytes }) => ({
        method: "POST",
        path: "/dictionaries",
        body: { kind: "bytes", value: bytes, contentType: "application/zip" },
        offlineOperation: { kind: "parseDictionary", bytes },
      }),
      invalidatesTags: ["Dictionaries"],
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
    lookupTerm: build.query<LookupResponse, { id: string; term: string }>({
      query: ({ id, term }) => ({
        method: "GET",
        path: `/dictionaries/${id}/lookup`,
        query: { term },
      }),
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
  useImportLocalDictionaryMutation,
  useListDictionariesQuery,
  useLookupTermQuery,
} = backendApi;
