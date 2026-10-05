import type {
  AddMediaFileRequest,
  AddSubtitleTrackRequest,
  ConversionCacheStatus,
  DictionarySummary,
  Document,
  DocumentFormat,
  EmbeddedSubtitleTracksResponse,
  Flashcard,
  FlashcardDraft,
  ImportLocalDictionaryRequest,
  ListDictionariesResponse,
  ListFlashcardsResponse,
  ListMediaFilesResponse,
  ListProjectsResponse,
  LookupResponse,
  MediaFile,
  ParseLocalDocumentRequest,
  ParseTimedTextRequest,
  PlaybackRequest,
  PlaybackResponse,
  Project,
  ProjectSettings,
  SubtitleSelection,
  SubtitleTrack,
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
      { projectId: string; draft: FlashcardDraft }
    >({
      query: ({ projectId, draft }) => ({
        method: "POST",
        path: `/projects/${projectId}/flashcards`,
        body: { kind: "json", value: draft },
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
  useParseTimedTextMutation,
  useParseDocumentMutation,
  useParseLocalDocumentMutation,
  useImportDictionaryMutation,
  useImportLocalDictionaryMutation,
  useListDictionariesQuery,
  useLookupTermQuery,
} = backendApi;
