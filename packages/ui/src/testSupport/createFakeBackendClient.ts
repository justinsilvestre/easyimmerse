import type { BackendClient, BackendRequest } from "@easyimmerse/backend";

/** Builds a client that answers each `METHOD /path` with a canned value and records every request. */
export function createFakeBackendClient(
  responses: Record<string, unknown>,
): BackendClient & { requests: BackendRequest[] } {
  const requests: BackendRequest[] = [];
  return {
    requests,
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      const key = `${request.method} ${request.path}`;
      if (!(key in responses))
        return { error: { status: 404, message: `No canned ${key}` } };
      return { data: responses[key] as T };
    },
  };
}
