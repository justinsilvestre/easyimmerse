import type { BackendClient, BackendRequest } from "@easyimmerse/backend";

/** A canned response, or a function computing one from the request. */
export type FakeResponse = unknown | ((request: BackendRequest) => unknown);

/** Answers requests with the method whose path matches the pattern, for paths that contain ids. */
export type FakeRoute = [
  method: BackendRequest["method"],
  path: RegExp,
  response: FakeResponse,
];

/**
 * Builds a client that answers each `METHOD /path` with a canned response and records every request.
 * The routes are tried first, then the exact `METHOD /path` keys. Anything else gets a 404.
 */
export function createFakeBackendClient(
  responses: Record<string, FakeResponse>,
  routes: readonly FakeRoute[] = [],
): BackendClient & { requests: BackendRequest[] } {
  const requests: BackendRequest[] = [];
  return {
    requests,
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      const found = findResponse(request, responses, routes);
      if (found === null)
        return {
          error: { status: 404, message: `No canned ${describe(request)}` },
        };
      return { data: respond(found.response, request) as T };
    },
  };
}

function findResponse(
  request: BackendRequest,
  responses: Record<string, FakeResponse>,
  routes: readonly FakeRoute[],
): { response: FakeResponse } | null {
  const route = routes.find(
    ([method, path]) => method === request.method && path.test(request.path),
  );
  if (route) return { response: route[2] };
  const key = describe(request);
  return key in responses ? { response: responses[key] } : null;
}

function respond(response: FakeResponse, request: BackendRequest): unknown {
  return typeof response === "function" ? response(request) : response;
}

function describe(request: BackendRequest): string {
  return `${request.method} ${request.path}`;
}
