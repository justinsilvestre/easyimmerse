import type {
  RequestOutcome,
  RequestSettled,
  ServerRequest,
  ServerRequestKind,
} from "./serverRequest.ts";

/** The action creator for the end of a server request. Only the effects middleware dispatches it outside tests. */
export const serverActions = {
  /** The request sent with this id ended with the given outcome. */
  requestSettled: <K extends ServerRequestKind>(
    id: string,
    request: Extract<ServerRequest, { kind: K }>,
    outcome: RequestOutcome<K>,
  ) => ({ type: "requestSettled", id, request, outcome }) as RequestSettled,
};

/** An action of the server: the end of a request. */
export type ServerAction = RequestSettled;
