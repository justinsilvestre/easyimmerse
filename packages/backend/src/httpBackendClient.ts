import type { ApiError } from "@easyimmerse/types";
import type {
  BackendClient,
  BackendError,
  BackendRequest,
  BackendRequestBody,
  BackendResult,
} from "./backendClient.ts";
import { buildAuthorizationHeader } from "./conversionFileUrl.ts";

type HttpBackendOptions = {
  serverUrl: string;
  token: string;
  fetch?: typeof fetch;
};

/** Builds a client that sends every request to a server over HTTP with a bearer token. */
export function createHttpBackendClient(
  options: HttpBackendOptions,
): BackendClient {
  const fetchFn = options.fetch ?? globalThis.fetch;
  return {
    send: async (request) => {
      try {
        const response = await fetchFn(buildUrl(options.serverUrl, request), {
          method: request.method,
          headers: buildHeaders(options, request.body),
          body: serializeBody(request.body),
        });
        return readResponse(response);
      } catch (cause) {
        return { error: { status: "NETWORK", message: describe(cause) } };
      }
    },
  };
}

function buildUrl(serverUrl: string, request: BackendRequest): string {
  const url = new URL(request.path, serverUrl);
  for (const [name, value] of Object.entries(request.query ?? {}))
    url.searchParams.set(name, value);
  return url.toString();
}

function buildHeaders(
  server: HttpBackendOptions,
  body: BackendRequestBody | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {
    authorization: buildAuthorizationHeader(server),
  };
  if (body?.kind === "json") headers["content-type"] = "application/json";
  if (body?.kind === "bytes") headers["content-type"] = body.contentType;
  return headers;
}

function serializeBody(body: BackendRequestBody | undefined): BodyInit | null {
  if (body === undefined) return null;
  if (body.kind === "json") return JSON.stringify(body.value);
  // A Uint8Array is not a BodyInit in TypeScript's lib types, but fetch accepts it.
  return body.value as BodyInit;
}

async function readResponse<T>(response: Response): Promise<BackendResult<T>> {
  if (!response.ok) return { error: await readError(response) };
  if (response.status === 204) return { data: undefined as T };
  return { data: (await response.json()) as T };
}

async function readError(response: Response): Promise<BackendError> {
  const apiError = await readApiError(response);
  if (apiError === null)
    return { status: response.status, message: response.statusText };
  return {
    status: response.status,
    code: apiError.code,
    message: apiError.message,
  };
}

async function readApiError(response: Response): Promise<ApiError | null> {
  try {
    const body: unknown = await response.json();
    return isApiError(body) ? body : null;
  } catch {
    return null;
  }
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null) return false;
  return "code" in value && "message" in value;
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
