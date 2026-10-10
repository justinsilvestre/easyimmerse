import type {
  AddMediaFileRequest,
  AddSubtitleTrackRequest,
  ListMediaFilesResponse,
  MediaFile,
  SubtitleTrack,
  SubtitleTracksResponse,
} from "@easyimmerse/types";
import type { Dispatch } from "redux";

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
  | { kind: "addMediaFile"; projectId: string; request: AddMediaFileRequest };

/** The kind of a server request. */
export type ServerRequestKind = ServerRequest["kind"];

/** The data each kind of request receives when it succeeds. */
export type ServerResponses = {
  listSubtitleTracks: SubtitleTracksResponse;
  addSubtitleTrack: SubtitleTrack;
  listMediaFiles: ListMediaFilesResponse;
  addMediaFile: MediaFile;
};

/** Why a request failed: an HTTP status, or a marker for a request that never reached a server or was aborted. */
export type RequestFailure = {
  status: number | "OFFLINE" | "NETWORK" | "ABORTED";
  code?: string;
  message: string;
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
