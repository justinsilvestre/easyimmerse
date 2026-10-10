import type {
  AddMediaFileRequest,
  AddSubtitleTrackRequest,
  ImportFormRequest,
  ImportJobStarted,
  ImportJobStatus,
  ImportStepRequest,
  ImportStepResponse,
  ListMediaFilesResponse,
  MediaFile,
  MediaSourceJob,
  ParseTimedTextRequest,
  PluginForm,
  SubtitleTrack,
  SubtitleTracksResponse,
  TableLayout,
  TablePreview,
  TimedTextTrack,
} from "@easyimmerse/types";
import type { Dispatch } from "redux";
import type { PickedDictionaryFile } from "../platform/effects.ts";

/** A request to the server that an update may send, one member per endpoint an update needs. */
export type ServerRequest =
  | { kind: "listSubtitleTracks"; projectId: string; mediaFileId: string }
  | {
      kind: "addSubtitleTrack";
      projectId: string;
      mediaFileId: string;
      request: AddSubtitleTrackRequest;
    }
  | { kind: "listMediaFiles"; projectId: string }
  | { kind: "addMediaFile"; projectId: string; request: AddMediaFileRequest }
  | { kind: "parseTimedText"; request: ParseTimedTextRequest }
  | { kind: "getImportJob"; jobId: string }
  | { kind: "getMediaSourceJob"; projectId: string; jobId: string }
  | { kind: "markProjectOpened"; projectId: string }
  | { kind: "getImportForm"; projectId: string; request: ImportFormRequest }
  | { kind: "submitImportStep"; projectId: string; request: ImportStepRequest }
  | { kind: "previewDictionaryTable"; file: PickedDictionaryFile }
  | {
      kind: "importDictionary";
      file: PickedDictionaryFile;
      tableLayout: TableLayout | null;
    };

/** The kind of a server request. */
export type ServerRequestKind = ServerRequest["kind"];

/** The data each kind of request receives when it succeeds. */
export type ServerResponses = {
  listSubtitleTracks: SubtitleTracksResponse;
  addSubtitleTrack: SubtitleTrack;
  listMediaFiles: ListMediaFilesResponse;
  addMediaFile: MediaFile;
  parseTimedText: TimedTextTrack;
  getImportJob: ImportJobStatus;
  getMediaSourceJob: MediaSourceJob;
  // biome-ignore lint/suspicious/noConfusingVoidType: The endpoint answers with no data, which RTK Query types as void.
  markProjectOpened: void;
  getImportForm: PluginForm;
  submitImportStep: ImportStepResponse;
  previewDictionaryTable: TablePreview;
  importDictionary: ImportJobStarted;
};

/** Why a request failed: an HTTP status, or a marker for a request that never reached a server or was aborted. */
export type RequestFailure = {
  status: number | "OFFLINE" | "NETWORK" | "ABORTED";
  code?: string;
  message: string;
};

/** The failure of a request that was aborted, whether in flight or while it waited. */
export const abortedFailure: RequestFailure = {
  status: "ABORTED",
  message: "The request was aborted.",
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
