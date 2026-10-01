import type { BackendClient, BackendRequest } from "@easyimmerse/backend";

/** A canned response, or a function computing one from the request. */
export type FakeResponse = unknown | ((request: BackendRequest) => unknown);

/** Builds a client that answers each `METHOD /path` with a canned response and records every request. Anything else gets a 404. */
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
  };
}

function respond(response: FakeResponse, request: BackendRequest): unknown {
  return typeof response === "function" ? response(request) : response;
}
