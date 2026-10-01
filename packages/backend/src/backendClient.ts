import type { OfflineOperation } from "./offlineOperation.ts";

export type BackendRequestBody =
  | { kind: "json"; value: unknown }
  | { kind: "bytes"; value: Uint8Array | Blob; contentType: string };

export type BackendRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string>;
  body?: BackendRequestBody;
  /** How to read a successful response's body. Defaults to JSON. */
  responseType?: "json" | "text";
  /** The equivalent WebAssembly operation, for clients that have no server. */
  offlineOperation?: OfflineOperation;
};

export type BackendError = {
  /** An HTTP status, or a marker for a request that never reached a server. */
  status: number | "OFFLINE" | "NETWORK";
  code?: string;
  message: string;
};

export type BackendResult<T> = { data: T } | { error: BackendError };

/** The one way the frontend reaches the backend, over HTTP or through WebAssembly. */
export interface BackendClient {
  send<T>(request: BackendRequest): Promise<BackendResult<T>>;
  /**
   * Builds a URL that an element unable to send headers, such as an image, can load the request's response from.
   * Clients without a server leave it out.
   */
  resolveUrl?(request: BackendRequest): string;
}
