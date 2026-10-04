import type {
  AddMediaFileRequest,
  AddSubtitleFileRequest,
  ConversionCacheStatus,
  DictionarySummary,
  Document,
  DocumentFormat,
  Flashcard,
  FlashcardScreenshot,
  ImportLocalDictionaryRequest,
  ListDictionariesResponse,
  ListFlashcardsResponse,
  ListMediaFilesResponse,
  ListProjectsResponse,
  ListSubtitleFilesResponse,
  LookupResponse,
  MediaFile,
  MoveDirection,
  ParseLocalDocumentRequest,
  ParseTimedTextRequest,
  PlaybackRequest,
  PlaybackResponse,
  PreferenceValue,
  Project,
  SaveFlashcardRequest,
  SaveProjectRequest,
  SubtitleFile,
  SubtitleSelection,
  SubtitleTracksResponse,
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

type AddMediaFileArgs = { projectId: string; request: AddMediaFileRequest };

type MediaFileArgs = { projectId: string; mediaFileId: string };

type PlanPlaybackArgs = MediaFileArgs & { request: PlaybackRequest };

type SaveTrackSelectionArgs = MediaFileArgs & { selection: TrackSelection };

type WaveformWindowArgs = MediaFileArgs & { startMs: number; endMs: number };

type SaveProjectArgs = { projectId: string; request: SaveProjectRequest };

type FlashcardArgs = { projectId: string; flashcardId: string };

type CreateFlashcardArgs = { projectId: string; request: SaveFlashcardRequest };

type UpdateFlashcardArgs = FlashcardArgs & { request: SaveFlashcardRequest };

type AddSubtitleFileArgs = MediaFileArgs & { request: AddSubtitleFileRequest };

type SubtitleFileArgs = MediaFileArgs & { subtitleFileId: string };

type SaveSubtitleSelectionArgs = MediaFileArgs & {
  selection: SubtitleSelection;
};

type EmbeddedSubtitlesArgs = MediaFileArgs & { streamIndex: number };

type ImportDictionaryArgs = {
  bytes: Uint8Array;
  sourceLanguage: string | null;
  targetLanguage: string | null;
};

type LookupArgs = { language: string; term: string };

const flashcardPath = ({ projectId, flashcardId }: FlashcardArgs) =>
  `/projects/${projectId}/flashcards/${flashcardId}`;

/** The project list, whose counts and order change with any project's media, flashcards, or opening. */
const projectList = { type: "Projects" as const, id: "LIST" };

/** The tags whose data a change to a flashcard makes stale. */
const flashcardChangeTags = ({ projectId, flashcardId }: FlashcardArgs) => [
  { type: "Flashcards" as const, id: projectId },
  { type: "FlashcardScreenshot" as const, id: flashcardId },
  projectList,
];

const mediaFilePath = ({ projectId, mediaFileId }: MediaFileArgs) =>
  `/projects/${projectId}/media/${mediaFileId}`;

/** Every server operation, one endpoint each. Bodies and paths follow the OpenAPI document. */
export const backendApi = createApi({
  reducerPath: "backend",
  baseQuery: injectedBaseQuery,
  tagTypes: [
    "Projects",
    "MediaFiles",
    "Flashcards",
    "FlashcardScreenshot",
    "SubtitleFiles",
    "Preferences",
    "Dictionaries",
    "ConversionCache",
  ],
  endpoints: (build) => ({
    listProjects: build.query<ListProjectsResponse, void>({
      query: () => ({ method: "GET", path: "/projects" }),
      providesTags: [projectList],
    }),
    getProject: build.query<Project, string>({
      query: (projectId) => ({ method: "GET", path: `/projects/${projectId}` }),
      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: projectId },
      ],
    }),
    createProject: build.mutation<Project, SaveProjectRequest>({
      query: (request) => ({
        method: "POST",
        path: "/projects",
        body: { kind: "json", value: request },
      }),
      invalidatesTags: [projectList],
    }),
    updateProject: build.mutation<Project, SaveProjectArgs>({
      query: ({ projectId, request }) => ({
        method: "PUT",
        path: `/projects/${projectId}`,
        body: { kind: "json", value: request },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        projectList,
        { type: "Projects", id: projectId },
      ],
    }),
    deleteProject: build.mutation<void, string>({
      query: (projectId) => ({
        method: "DELETE",
        path: `/projects/${projectId}`,
      }),
      invalidatesTags: (_result, _error, projectId) => [
        projectList,
        { type: "Projects", id: projectId },
      ],
    }),
    markProjectOpened: build.mutation<void, string>({
      query: (projectId) => ({
        method: "POST",
        path: `/projects/${projectId}/opened`,
      }),
      invalidatesTags: [projectList],
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
    createFlashcard: build.mutation<Flashcard, CreateFlashcardArgs>({
      query: ({ projectId, request }) => ({
        method: "POST",
        path: `/projects/${projectId}/flashcards`,
        body: { kind: "json", value: request },
      }),
      invalidatesTags: (result, _error, { projectId }) =>
        flashcardChangeTags({ projectId, flashcardId: result?.id ?? "" }),
    }),
    updateFlashcard: build.mutation<Flashcard, UpdateFlashcardArgs>({
      query: ({ request, ...args }) => ({
        method: "PUT",
        path: flashcardPath(args),
        body: { kind: "json", value: request },
      }),
      invalidatesTags: (_result, _error, args) => flashcardChangeTags(args),
    }),
    deleteFlashcard: build.mutation<void, FlashcardArgs>({
      query: (args) => ({ method: "DELETE", path: flashcardPath(args) }),
      invalidatesTags: (_result, _error, args) => flashcardChangeTags(args),
    }),
    getFlashcardScreenshot: build.query<FlashcardScreenshot, FlashcardArgs>({
      query: (args) => ({
        method: "GET",
        path: `${flashcardPath(args)}/screenshot`,
      }),
      providesTags: (_result, _error, { flashcardId }) => [
        { type: "FlashcardScreenshot", id: flashcardId },
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
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "MediaFiles", id: projectId },
        projectList,
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
        projectList,
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
    getEmbeddedSubtitles: build.query<TimedTextTrack, EmbeddedSubtitlesArgs>({
      query: ({ streamIndex, ...args }) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/subtitle-tracks/${streamIndex}/cues`,
      }),
    }),
    listSubtitleFiles: build.query<ListSubtitleFilesResponse, MediaFileArgs>({
      query: (args) => ({
        method: "GET",
        path: `${mediaFilePath(args)}/subtitle-files`,
      }),
      providesTags: (_result, _error, { mediaFileId }) => [
        { type: "SubtitleFiles", id: mediaFileId },
      ],
    }),
    addSubtitleFile: build.mutation<SubtitleFile, AddSubtitleFileArgs>({
      query: ({ request, ...args }) => ({
        method: "POST",
        path: `${mediaFilePath(args)}/subtitle-files`,
        body: { kind: "json", value: request },
      }),
      invalidatesTags: (_result, _error, { mediaFileId }) => [
        { type: "SubtitleFiles", id: mediaFileId },
      ],
    }),
    deleteSubtitleFile: build.mutation<void, SubtitleFileArgs>({
      query: ({ subtitleFileId, ...args }) => ({
        method: "DELETE",
        path: `${mediaFilePath(args)}/subtitle-files/${subtitleFileId}`,
      }),
      invalidatesTags: (_result, _error, { projectId, mediaFileId }) => [
        { type: "SubtitleFiles", id: mediaFileId },
        { type: "MediaFiles", id: projectId },
      ],
    }),
    saveSubtitleSelection: build.mutation<void, SaveSubtitleSelectionArgs>({
      query: ({ selection, ...args }) => ({
        method: "PUT",
        path: `${mediaFilePath(args)}/subtitle-selection`,
        body: { kind: "json", value: selection },
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
      query: ({ bytes, sourceLanguage, targetLanguage }) => ({
        method: "POST",
        path: "/dictionaries",
        query: languageQuery(sourceLanguage, targetLanguage),
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
    setDictionaryEnabled: build.mutation<
      DictionarySummary,
      { dictionaryId: string; isEnabled: boolean }
    >({
      query: ({ dictionaryId, isEnabled }) => ({
        method: "PUT",
        path: `/dictionaries/${dictionaryId}`,
        body: { kind: "json", value: { is_enabled: isEnabled } },
      }),
      invalidatesTags: ["Dictionaries"],
    }),
    moveDictionary: build.mutation<
      ListDictionariesResponse,
      { dictionaryId: string; direction: MoveDirection }
    >({
      query: ({ dictionaryId, direction }) => ({
        method: "POST",
        path: `/dictionaries/${dictionaryId}/move`,
        body: { kind: "json", value: { direction } },
      }),
      invalidatesTags: ["Dictionaries"],
    }),
    deleteDictionary: build.mutation<void, string>({
      query: (dictionaryId) => ({
        method: "DELETE",
        path: `/dictionaries/${dictionaryId}`,
      }),
      invalidatesTags: ["Dictionaries"],
    }),
    lookup: build.query<LookupResponse, LookupArgs>({
      query: ({ language, term }) => ({
        method: "GET",
        path: "/lookup",
        query: { language, term },
      }),
      providesTags: ["Dictionaries"],
    }),
  }),
});

/** The languages an imported dictionary is filed under, for those the caller knows. */
function languageQuery(
  sourceLanguage: string | null,
  targetLanguage: string | null,
): Record<string, string> {
  return {
    ...(sourceLanguage === null ? {} : { source_language: sourceLanguage }),
    ...(targetLanguage === null ? {} : { target_language: targetLanguage }),
  };
}

export const {
  useListProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useMarkProjectOpenedMutation,
  useListFlashcardsQuery,
  useCreateFlashcardMutation,
  useUpdateFlashcardMutation,
  useDeleteFlashcardMutation,
  useLazyGetFlashcardScreenshotQuery,
  useListMediaFilesQuery,
  useAddMediaFileMutation,
  useRemoveMediaFileMutation,
  useGetMediaTracksQuery,
  usePlanPlaybackQuery,
  useSaveTrackSelectionMutation,
  useClearTrackSelectionMutation,
  useLazyGetWaveformWindowQuery,
  useListSubtitleTracksQuery,
  useGetEmbeddedSubtitlesQuery,
  useListSubtitleFilesQuery,
  useAddSubtitleFileMutation,
  useDeleteSubtitleFileMutation,
  useSaveSubtitleSelectionMutation,
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
  useSetDictionaryEnabledMutation,
  useMoveDictionaryMutation,
  useDeleteDictionaryMutation,
  useLookupQuery,
  useLazyLookupQuery,
} = backendApi;
