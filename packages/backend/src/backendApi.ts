import type {
  DictionaryLanguages,
  DictionarySummary,
  Document,
  DocumentFormat,
  EmbeddedSubtitlesResponse,
  Flashcard,
  FlashcardDraftRequest,
  ImportLocalDictionaryRequest,
  ListDictionariesResponse,
  ListFlashcardsResponse,
  ListProjectsResponse,
  LookupAllResponse,
  LookupResponse,
  MediaFile,
  MediaTracks,
  NewFlashcard,
  NewMediaFile,
  NewSubtitleTrack,
  ParseLocalDocumentRequest,
  ParseTimedTextRequest,
  PlaybackRequest,
  PlaybackResponse,
  PreferenceValue,
  Project,
  ProjectSettings,
  SubtitleTrack,
  TimedTextTrack,
  UpdateMediaDurationRequest,
} from "@easyimmerse/types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { injectedBaseQuery } from "./injectedBaseQuery.ts";
import {
  buildMediaTracksRequest,
  buildPlaybackRequest,
} from "./mediaPlaybackRequests.ts";

type ParseDocumentArgs = {
  bytes: Uint8Array | Blob;
  format: DocumentFormat | null;
  contentType: string;
};

type ProjectArgs = { projectId: string };
type MediaArgs = ProjectArgs & { mediaId: string };
type TrackArgs = MediaArgs & { trackId: string };
type FlashcardArgs = ProjectArgs & { flashcardId: string };

const json = (value: unknown) => ({ kind: "json", value }) as const;

const projectTag = (projectId: string) =>
  ({ type: "Project", id: projectId }) as const;

const flashcardsTag = (projectId: string) =>
  ({ type: "Flashcards", id: projectId }) as const;

/** Every server operation, one endpoint each. Bodies and paths follow the OpenAPI document. */
export const backendApi = createApi({
  reducerPath: "backend",
  baseQuery: injectedBaseQuery,
  tagTypes: [
    "Projects",
    "Project",
    "Flashcards",
    "Preferences",
    "Dictionaries",
  ],
  endpoints: (build) => ({
    listProjects: build.query<ListProjectsResponse, void>({
      query: () => ({ method: "GET", path: "/projects" }),
      providesTags: ["Projects"],
    }),
    createProject: build.mutation<Project, ProjectSettings>({
      query: (settings) => ({
        method: "POST",
        path: "/projects",
        body: json(settings),
      }),
      invalidatesTags: ["Projects"],
    }),
    getProject: build.query<Project, string>({
      query: (projectId) => ({ method: "GET", path: `/projects/${projectId}` }),
      providesTags: (_result, _error, projectId) => [projectTag(projectId)],
    }),
    updateProjectSettings: build.mutation<
      Project,
      ProjectArgs & { settings: ProjectSettings }
    >({
      query: ({ projectId, settings }) => ({
        method: "PUT",
        path: `/projects/${projectId}/settings`,
        body: json(settings),
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        "Projects",
        projectTag(projectId),
      ],
    }),
    markProjectOpened: build.mutation<Project, string>({
      query: (projectId) => ({
        method: "POST",
        path: `/projects/${projectId}/opened`,
      }),
      invalidatesTags: ["Projects"],
    }),
    deleteProject: build.mutation<void, string>({
      query: (projectId) => ({
        method: "DELETE",
        path: `/projects/${projectId}`,
      }),
      invalidatesTags: ["Projects"],
    }),
    addMediaFile: build.mutation<
      MediaFile,
      ProjectArgs & { media: NewMediaFile }
    >({
      query: ({ projectId, media }) => ({
        method: "POST",
        path: `/projects/${projectId}/media`,
        body: json(media),
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        projectTag(projectId),
      ],
    }),
    setMediaDuration: build.mutation<
      MediaFile,
      MediaArgs & UpdateMediaDurationRequest
    >({
      query: ({ projectId, mediaId, duration_ms }) => ({
        method: "PUT",
        path: `/projects/${projectId}/media/${mediaId}/duration`,
        body: json({ duration_ms } satisfies UpdateMediaDurationRequest),
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        projectTag(projectId),
      ],
    }),
    removeMediaFile: build.mutation<void, MediaArgs>({
      query: ({ projectId, mediaId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/media/${mediaId}`,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        projectTag(projectId),
      ],
    }),
    addSubtitleTrack: build.mutation<
      SubtitleTrack,
      MediaArgs & { track: NewSubtitleTrack }
    >({
      query: ({ projectId, mediaId, track }) => ({
        method: "POST",
        path: `/projects/${projectId}/media/${mediaId}/subtitle-tracks`,
        body: json(track),
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        projectTag(projectId),
      ],
    }),
    removeSubtitleTrack: build.mutation<void, TrackArgs>({
      query: ({ projectId, mediaId, trackId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/media/${mediaId}/subtitle-tracks/${trackId}`,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        projectTag(projectId),
      ],
    }),
    getSubtitleCues: build.query<TimedTextTrack, TrackArgs>({
      query: ({ projectId, mediaId, trackId }) => ({
        method: "GET",
        path: `/projects/${projectId}/media/${mediaId}/subtitle-tracks/${trackId}/cues`,
      }),
    }),
    listEmbeddedSubtitles: build.query<EmbeddedSubtitlesResponse, MediaArgs>({
      query: ({ projectId, mediaId }) => ({
        method: "GET",
        path: `/projects/${projectId}/media/${mediaId}/embedded-subtitles`,
      }),
    }),
    getMediaTracks: build.query<MediaTracks, MediaArgs>({
      query: ({ projectId, mediaId }) =>
        buildMediaTracksRequest(projectId, mediaId),
    }),
    planPlayback: build.mutation<PlaybackResponse, MediaArgs & PlaybackRequest>(
      {
        query: ({ projectId, mediaId, environment }) =>
          buildPlaybackRequest(projectId, mediaId, { environment }),
      },
    ),
    listFlashcards: build.query<ListFlashcardsResponse, string>({
      query: (projectId) => ({
        method: "GET",
        path: `/projects/${projectId}/flashcards`,
      }),
      providesTags: (_result, _error, projectId) => [flashcardsTag(projectId)],
    }),
    createFlashcard: build.mutation<
      Flashcard,
      ProjectArgs & { card: NewFlashcard }
    >({
      query: ({ projectId, card }) => ({
        method: "POST",
        path: `/projects/${projectId}/flashcards`,
        body: json(card),
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        flashcardsTag(projectId),
      ],
    }),
    updateFlashcard: build.mutation<
      Flashcard,
      FlashcardArgs & { card: NewFlashcard }
    >({
      query: ({ projectId, flashcardId, card }) => ({
        method: "PUT",
        path: `/projects/${projectId}/flashcards/${flashcardId}`,
        body: json(card),
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        flashcardsTag(projectId),
      ],
    }),
    deleteFlashcard: build.mutation<void, FlashcardArgs>({
      query: ({ projectId, flashcardId }) => ({
        method: "DELETE",
        path: `/projects/${projectId}/flashcards/${flashcardId}`,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        flashcardsTag(projectId),
      ],
    }),
    draftFlashcard: build.mutation<NewFlashcard, FlashcardDraftRequest>({
      query: (request) => ({
        method: "POST",
        path: "/flashcards/draft",
        body: json(request),
        offlineOperation: { kind: "draftFlashcard", request },
      }),
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
        body: json({ value } satisfies PreferenceValue),
      }),
      invalidatesTags: (_result, _error, { key }) => [
        { type: "Preferences", id: key },
      ],
    }),
    parseTimedText: build.mutation<TimedTextTrack, ParseTimedTextRequest>({
      query: (request) => ({
        method: "POST",
        path: "/timed-text/parse",
        body: json(request),
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
        body: json(request),
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
        body: json(request),
      }),
      invalidatesTags: ["Dictionaries"],
    }),
    listDictionaries: build.query<ListDictionariesResponse, void>({
      query: () => ({ method: "GET", path: "/dictionaries" }),
      providesTags: ["Dictionaries"],
    }),
    setDictionaryLanguages: build.mutation<
      DictionarySummary,
      { id: string; languages: DictionaryLanguages }
    >({
      query: ({ id, languages }) => ({
        method: "PUT",
        path: `/dictionaries/${id}/languages`,
        body: json(languages),
      }),
      invalidatesTags: ["Dictionaries"],
    }),
    deleteDictionary: build.mutation<void, string>({
      query: (id) => ({ method: "DELETE", path: `/dictionaries/${id}` }),
      invalidatesTags: ["Dictionaries"],
    }),
    lookupTerm: build.query<LookupResponse, { id: string; term: string }>({
      query: ({ id, term }) => ({
        method: "GET",
        path: `/dictionaries/${id}/lookup`,
        query: { term },
      }),
    }),
    lookupTermEverywhere: build.query<LookupAllResponse, string>({
      query: (term) => ({
        method: "GET",
        path: "/dictionaries/lookup",
        query: { term },
      }),
    }),
  }),
});

export const {
  useListProjectsQuery,
  useCreateProjectMutation,
  useGetProjectQuery,
  useUpdateProjectSettingsMutation,
  useMarkProjectOpenedMutation,
  useDeleteProjectMutation,
  useAddMediaFileMutation,
  useSetMediaDurationMutation,
  useRemoveMediaFileMutation,
  useAddSubtitleTrackMutation,
  useRemoveSubtitleTrackMutation,
  useGetSubtitleCuesQuery,
  useListEmbeddedSubtitlesQuery,
  useGetMediaTracksQuery,
  usePlanPlaybackMutation,
  useListFlashcardsQuery,
  useCreateFlashcardMutation,
  useUpdateFlashcardMutation,
  useDeleteFlashcardMutation,
  useDraftFlashcardMutation,
  useGetPreferenceQuery,
  useSetPreferenceMutation,
  useParseTimedTextMutation,
  useParseDocumentMutation,
  useParseLocalDocumentMutation,
  useImportDictionaryMutation,
  useImportLocalDictionaryMutation,
  useListDictionariesQuery,
  useSetDictionaryLanguagesMutation,
  useDeleteDictionaryMutation,
  useLookupTermQuery,
  useLookupTermEverywhereQuery,
  useLazyLookupTermEverywhereQuery,
} = backendApi;
