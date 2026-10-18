import type {
  AddMediaFileRequest,
  AddSubtitleTrackRequest,
  AlignmentsResponse,
  ConversionCacheBudget,
  ConversionCacheStatus,
  Flashcard,
  FlashcardDraft,
  ImportFormRequest,
  ImportJobStarted,
  ImportJobStatus,
  ImportStepRequest,
  ImportStepResponse,
  ListFlashcardsResponse,
  ListMediaFilesResponse,
  LookupQuery,
  LookupResponse,
  MediaFile,
  MediaSourceJob,
  ParseTimedTextRequest,
  PlaybackMethodRequest,
  PlaybackMethodResponse,
  PluginForm,
  Project,
  ProjectSettings,
  SourceStepRequest,
  SourceStepResponse,
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
import type { Dispatch } from "redux";
import type { DeletedFlashcard } from "../anki/ankiRequests.ts";
import type {
  AnkiConnection,
  AnkiDeletionOutcome,
  AnkiPackageExport,
  AnkiSendOutcome,
} from "../anki/ankiResponses.ts";
import type {
  DeletePurpose,
  SavePurpose,
} from "../flashcards/flashcardRequests.ts";
import type {
  PickedDictionaryFile,
  PickedMediaFile,
} from "../platform/effects.ts";

/** A request to the server that an update may send, one member per endpoint an update needs. */
export type ServerRequest =
  | { kind: "listSubtitleTracks"; projectId: string; mediaFileId: string }
  | {
      kind: "addSubtitleTrack";
      projectId: string;
      mediaFileId: string;
      request: AddSubtitleTrackRequest;
    }
  | { kind: "getProject"; projectId: string }
  | { kind: "listMediaFiles"; projectId: string }
  | { kind: "listAlignments"; projectId: string; mediaFileId: string }
  | { kind: "listFlashcards"; projectId: string }
  | { kind: "addMediaFile"; projectId: string; request: AddMediaFileRequest }
  | { kind: "parseTimedText"; request: ParseTimedTextRequest }
  | { kind: "getImportJob"; jobId: string }
  | { kind: "getMediaSourceJob"; projectId: string; jobId: string }
  | { kind: "markProjectOpened"; projectId: string }
  | { kind: "getImportForm"; projectId: string; request: ImportFormRequest }
  | { kind: "submitImportStep"; projectId: string; request: ImportStepRequest }
  | { kind: "getSourceForm"; projectId: string; mediaFileId: string }
  | {
      kind: "submitSourceStep";
      projectId: string;
      mediaFileId: string;
      request: SourceStepRequest;
      /** The form the step was taken on, which names the tracks in the notice that follows. It is not sent. */
      form: PluginForm | null;
    }
  | { kind: "previewDictionaryTable"; file: PickedDictionaryFile }
  | {
      kind: "importDictionary";
      file: PickedDictionaryFile;
      tableLayout: TableLayout | null;
    }
  | { kind: "getMediaTracks"; projectId: string; mediaFileId: string }
  | {
      kind: "choosePlaybackMethod";
      projectId: string;
      mediaFileId: string;
      request: PlaybackMethodRequest;
    }
  | {
      kind: "saveTrackSelection";
      projectId: string;
      mediaFileId: string;
      selection: TrackSelection;
    }
  | {
      kind: "getWaveformWindow";
      projectId: string;
      mediaFileId: string;
      startMs: number;
      endMs: number;
    }
  | { kind: "lookupText"; query: LookupQuery }
  | { kind: "deleteDictionary"; dictionaryId: string }
  | { kind: "clearConversionCache" }
  | { kind: "setConversionCacheBudget"; budget: ConversionCacheBudget }
  | { kind: "createProject"; settings: ProjectSettings }
  | { kind: "updateProject"; projectId: string; settings: ProjectSettings }
  | { kind: "removeMediaFile"; projectId: string; mediaFileId: string }
  | {
      kind: "setSubtitleSelection";
      projectId: string;
      mediaFileId: string;
      selection: SubtitleSelection;
    }
  /** Pairs a document with the translation it is read beside, or clears the pairing with null. */
  | {
      kind: "setTranslationDocument";
      projectId: string;
      mediaFileId: string;
      translationMediaFileId: string | null;
    }
  /** Creates a new flashcard under its id, or replaces an existing one. `purpose` comes back with the outcome and is not sent. */
  | {
      kind: "saveFlashcard";
      projectId: string;
      flashcardId: string;
      draft: FlashcardDraft;
      isNew: boolean;
      purpose: SavePurpose;
    }
  /** Deletes a flashcard. `purpose` comes back with the outcome and is not sent. */
  | {
      kind: "deleteFlashcard";
      projectId: string;
      flashcardId: string;
      purpose: DeletePurpose;
    }
  /** Opens a media file the browser holds to learn whether it shows pictures. */
  | { kind: "probePictures"; file: PickedMediaFile }
  /** Asks AnkiConnect whether Anki is running. */
  | { kind: "checkAnkiConnection" }
  /** Sends flashcards to Anki through AnkiConnect, adding new notes and updating those Anki already has. */
  | {
      kind: "sendFlashcardsToAnki";
      projectId: string;
      flashcardIds: readonly string[];
    }
  /**
   * Deletes from Anki through AnkiConnect the notes of the project's deleted flashcards that the server lists as pending.
   * `justDeleted` is the flashcard whose deletion asked for this, which notices name, or null when nothing deleted just now asked; it is not sent.
   */
  | {
      kind: "deleteAnkiNotes";
      projectId: string;
      justDeleted: DeletedFlashcard | null;
    }
  /**
   * Exports flashcards as an Anki package, saved at `savePath`, or handed back for download when it is null, and marks them exported if asked.
   * A `staged` export records nothing, since its delivery is recorded by `recordAnkiExported` once the user keeps a copy.
   */
  | {
      kind: "exportAnkiPackage";
      projectId: string;
      flashcardIds: readonly string[];
      savePath: string | null;
      marksExported: boolean;
      staged: boolean;
    }
  /** Records the delivery of a staged package the user kept a copy of, marking its flashcards exported as of `readAtMs` if asked. */
  | {
      kind: "recordAnkiExported";
      projectId: string;
      flashcardIds: readonly string[];
      marksExported: boolean;
      readAtMs: number;
    }
  /** Forgets the named deletions from Anki, which the user marked done. */
  | {
      kind: "clearAnkiPendingDeletions";
      projectId: string;
      flashcardIds: readonly string[];
    }
  /** Turns AnkiConnect on or off for a project. */
  | {
      kind: "setAnkiConnect";
      projectId: string;
      usesAnkiConnect: boolean;
    };

/** The kind of a server request. */
export type ServerRequestKind = ServerRequest["kind"];

/** The data each kind of request receives when it succeeds. */
export type ServerResponses = {
  listSubtitleTracks: SubtitleTracksResponse;
  addSubtitleTrack: SubtitleTrack;
  getProject: Project;
  listMediaFiles: ListMediaFilesResponse;
  listAlignments: AlignmentsResponse;
  listFlashcards: ListFlashcardsResponse;
  addMediaFile: MediaFile;
  parseTimedText: TimedTextTrack;
  getImportJob: ImportJobStatus;
  getMediaSourceJob: MediaSourceJob;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  markProjectOpened: void;
  getImportForm: PluginForm;
  submitImportStep: ImportStepResponse;
  getSourceForm: PluginForm;
  submitSourceStep: SourceStepResponse;
  previewDictionaryTable: TablePreview;
  importDictionary: ImportJobStarted;
  getWaveformWindow: WaveformResponse;
  lookupText: LookupResponse;
  getMediaTracks: TracksResponse;
  choosePlaybackMethod: PlaybackMethodResponse;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  saveTrackSelection: void;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  deleteDictionary: void;
  clearConversionCache: ConversionCacheStatus;
  setConversionCacheBudget: ConversionCacheStatus;
  createProject: Project;
  updateProject: Project;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  removeMediaFile: void;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  setSubtitleSelection: void;
  setTranslationDocument: MediaFile;
  saveFlashcard: Flashcard;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  deleteFlashcard: void;
  probePictures: boolean;
  checkAnkiConnection: AnkiConnection;
  sendFlashcardsToAnki: AnkiSendOutcome;
  deleteAnkiNotes: AnkiDeletionOutcome;
  exportAnkiPackage: AnkiPackageExport;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  recordAnkiExported: void;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  clearAnkiPendingDeletions: void;
  setAnkiConnect: Project;
};

/** Why a request failed: an HTTP status, or a marker for a request that never reached a server, was aborted, or ended without data. */
export type RequestFailure = {
  status: number | "OFFLINE" | "NETWORK" | "ABORTED" | "NO_DATA";
  code?: string;
  message: string;
};

/** The failure of a request that was aborted, whether in flight or while it waited. */
export const abortedFailure: RequestFailure = {
  status: "ABORTED",
  message: "The request was aborted.",
};

/** The failure of a query that ended with neither data nor an error. */
export const noDataFailure: RequestFailure = {
  status: "NO_DATA",
  message: "The server's answer could not be read. Try again.",
};

/** How a request of the given kind ended. */
export type RequestOutcome<K extends ServerRequestKind = ServerRequestKind> =
  | { ok: true; data: ServerResponses[K] }
  | { ok: false; error: RequestFailure };

/** A request under way: how it ended, once it has, and a function that aborts it. */
export type RunningRequest<K extends ServerRequestKind = ServerRequestKind> = {
  /** Resolves with the outcome once the request ends. It never rejects. */
  settled: Promise<RequestOutcome<K>>;
  /** Aborts the request, which then settles as aborted unless it has already ended. */
  abort(): void;
};

/** Sends one request through the server parts' store and reports how it goes. */
export type RequestRunner = <R extends ServerRequest>(
  request: R,
  dispatch: Dispatch,
) => RunningRequest<R["kind"]>;

/** A request that ended, with its outcome. Each request an id names settles exactly once, an aborted one included. */
export type RequestSettled = {
  [K in ServerRequestKind]: {
    type: "requestSettled";
    id: string;
    request: Extract<ServerRequest, { kind: K }>;
    outcome: RequestOutcome<K>;
  };
}[ServerRequestKind];
