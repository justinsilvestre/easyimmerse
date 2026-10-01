import type { BackendClient, BackendRequest } from "@easyimmerse/backend";

/** A canned response, or a function computing one from the request. */
export type FakeResponse = unknown | ((request: BackendRequest) => unknown);

/**
 * Builds a client that answers each `METHOD /path` with a canned response and records every request. Anything else gets a 404.
 * It resolves a URL for a request whose canned response is a string, such as the URL of an image.
 */
export function createFakeBackendClient(
  responses: Record<string, FakeResponse>,
): BackendClient & { requests: BackendRequest[] } {
  const requests: BackendRequest[] = [];
  return {
    requests,
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      const key = `${request.method} ${request.path}`;
      if (!(key in responses))
        return { error: { status: 404, message: `No canned ${key}` } };
      return { data: respond(responses[key], request) as T };
    },
    resolveUrl: (request) => {
      const response = respond(responses[`GET ${request.path}`], request);
      return typeof response === "string" ? response : "about:blank";
    },
  };
}

function respond(response: FakeResponse, request: BackendRequest): unknown {
  return typeof response === "function" ? response(request) : response;
}
