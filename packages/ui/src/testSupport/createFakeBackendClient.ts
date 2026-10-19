import type {
  BackendClient,
  BackendError,
  BackendRequest,
} from "@easyimmerse/backend";
import type {
  AlignmentsResponse,
  ListMediaFilesResponse,
  MediaFile,
  ReviewAnswerUndone,
  TranslationDocumentSelection,
} from "@easyimmerse/types";

/** A canned response, or a function computing one from the request, possibly as a promise. */
export type FakeResponse = unknown | ((request: BackendRequest) => unknown);

const failureTag = Symbol("failure");

type FakeFailure = { [failureTag]: BackendError };

/** A canned response that the client reports as an error. */
export function fakeFailure(error: BackendError): FakeFailure {
  return { [failureTag]: error };
}

function isFakeFailure(value: unknown): value is FakeFailure {
  return typeof value === "object" && value !== null && failureTag in value;
}

/** Answers requests with the method whose path matches the pattern, for paths that contain ids. */
export type FakeRoute = [
  method: BackendRequest["method"],
  path: RegExp,
  response: FakeResponse,
];

/**
 * Builds a client that answers each `METHOD /path` with a canned response and records every request.
 * The routes are tried first, then the exact `METHOD /path` keys, then the defaults below.
 * Anything else gets a 404.
 *
 * By default a media file has no alignments, saving its translation document answers the
 * media file as the canned `GET /projects/{id}/media` lists it, with the translation set,
 * and undoing a review answer makes its card new again.
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
      const answer = await respond(found.response, request);
      if (isFakeFailure(answer)) return { error: answer[failureTag] };
      return { data: answer as T };
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
  if (key in responses) return { response: responses[key] };
  const fallback = defaultRoutes(responses).find(
    ([method, path]) => method === request.method && path.test(request.path),
  );
  return fallback ? { response: fallback[2] } : null;
}

const noAlignments: AlignmentsResponse = { alignments: [] };

const newAgain: ReviewAnswerUndone = {
  flashcard_id: "",
  state: null,
  intervals: { again_ms: 0, hard_ms: 0, good_ms: 0, easy_ms: 0 },
};

function defaultRoutes(
  responses: Record<string, FakeResponse>,
): readonly FakeRoute[] {
  return [
    ["GET", /^\/projects\/[^/]+\/media\/[^/]+\/alignments$/, noAlignments],
    [
      "PUT",
      /^\/projects\/[^/]+\/media\/[^/]+\/translation-document$/,
      (request: BackendRequest) => withTranslationDocument(responses, request),
    ],
    ["DELETE", /^\/projects\/[^/]+\/review\/answers\/\d+$/, newAgain],
  ];
}

/** The listed media file a translation-document request names, with the translation it sets, or a 404. */
function withTranslationDocument(
  responses: Record<string, FakeResponse>,
  request: BackendRequest,
): MediaFile | FakeFailure {
  const [, , projectId, , mediaFileId] = request.path.split("/");
  const listed = responses[`GET /projects/${projectId}/media`] as
    | ListMediaFilesResponse
    | undefined;
  const mediaFile = listed?.media_files.find(({ id }) => id === mediaFileId);
  if (mediaFile === undefined)
    return fakeFailure({
      status: 404,
      message: `No canned media file for ${describe(request)}`,
    });
  const selection = request.body?.value as TranslationDocumentSelection;
  return {
    ...mediaFile,
    translation_media_file_id: selection.translation_media_file_id,
  };
}

function respond(response: FakeResponse, request: BackendRequest): unknown {
  return typeof response === "function" ? response(request) : response;
}

function describe(request: BackendRequest): string {
  return `${request.method} ${request.path}`;
}
