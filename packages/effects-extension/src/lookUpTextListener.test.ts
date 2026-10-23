import type { BackendResult } from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";
import type { LookupResponse } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { createLookUpTextListener } from "./lookUpTextListener.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };
const response: LookupResponse = { results: [], kanji: [], stylesheets: [] };
const message = {
  kind: "lookUpText",
  query: { text: "Hund", language: "de" },
};

const answerWith = (body: unknown) => async () =>
  new Response(JSON.stringify(body), { status: 200 });

/** Sends a message to a listener built over the server and fetch, and resolves with its answer. */
function sendToListener(
  sentMessage: unknown,
  connectedServer: ServerConfig | null,
  fetchFn: typeof fetch = answerWith(response),
): Promise<BackendResult<LookupResponse>> {
  const listener = createLookUpTextListener(
    async () => connectedServer,
    fetchFn,
  );
  return new Promise((resolve) => listener(sentMessage, {}, resolve));
}

describe("createLookUpTextListener", () => {
  it("answers a lookup with the server's response", async () => {
    expect(await sendToListener(message, server)).toEqual({ data: response });
  });

  it("asks the server with the bearer token", async () => {
    const headers: Headers[] = [];
    const fetchFn: typeof fetch = async (_input, init) => {
      headers.push(new Headers(init?.headers));
      return new Response(JSON.stringify(response));
    };
    await sendToListener(message, server, fetchFn);
    expect(headers[0]?.get("authorization")).toBe("Bearer secret");
  });

  it("answers that no server is connected when there is none", async () => {
    const answer = await sendToListener(message, null);
    expect("error" in answer && answer.error.status).toBe("OFFLINE");
  });

  it("leaves other messages to other listeners", () => {
    const listener = createLookUpTextListener(async () => server);
    expect(listener({ kind: "other" }, {}, () => undefined)).toBe(false);
  });
});
