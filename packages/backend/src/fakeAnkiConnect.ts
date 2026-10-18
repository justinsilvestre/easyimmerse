import type { AnkiConnect, AnkiConnectRequest } from "./ankiConnect.ts";
import { AnkiConnectError } from "./ankiConnectError.ts";

/** How a fake Anki answers each action, by name, from its parameters. A handler throws to fail. */
export type AnkiAnswers = Partial<
  Record<string, (params: Record<string, unknown>) => unknown>
>;

/**
 * Builds an AnkiConnect client for tests that records every action and answers each from `answers`, as Anki would.
 * It runs the actions inside `multi` one by one. An action without an answer fails as though Anki were not running.
 */
export function createFakeAnkiConnect(
  answers: AnkiAnswers = {},
): AnkiConnect & { requests: AnkiConnectRequest[] } {
  const requests: AnkiConnectRequest[] = [];
  const answer = (request: AnkiConnectRequest): unknown => {
    requests.push(request);
    if (request.action === "multi")
      return (request.params.actions as AnkiConnectRequest[]).map(multiAnswer);
    const handler = answers[request.action];
    if (handler === undefined)
      throw new AnkiConnectError({ kind: "unreachable" });
    return handler(request.params);
  };
  const multiAnswer = (request: AnkiConnectRequest) => {
    try {
      return { result: answer(request), error: null };
    } catch (error) {
      return { result: null, error: (error as Error).message };
    }
  };
  return {
    requests,
    invoke: async <T>(request: AnkiConnectRequest) => answer(request) as T,
  };
}
