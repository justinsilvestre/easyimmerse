import type { ServerConfig } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createRemoteAuthInfoFetch } from "./fetchRemoteAuthInfo.ts";

const builtInServer: ServerConfig = {
  serverUrl: "http://127.0.0.1:4000",
  token: "launch-token",
  bundledIn: "desktop",
};

const remoteUrl = "https://cloud.example.org/";

type SentRequest = { url: string; init: RequestInit | undefined };

/** A fetch that records each request and answers with the given status and JSON body. */
function answering(status: number, body: unknown) {
  const sent: SentRequest[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    sent.push({ url: String(input), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  return { sent, fetchFn };
}

const offer = { accounts: true, open_signup: false, sends_email: true };

describe("createRemoteAuthInfoFetch", () => {
  it("asks the built-in server about the remote at its address", async () => {
    const { sent, fetchFn } = answering(200, offer);
    await createRemoteAuthInfoFetch(builtInServer, fetchFn)(remoteUrl);
    expect(sent.map(({ url }) => url)).toEqual([
      "http://127.0.0.1:4000/sync/remote-auth-info?server_url=https%3A%2F%2Fcloud.example.org%2F",
    ]);
  });

  it("sends the launch token", async () => {
    const { sent, fetchFn } = answering(200, offer);
    await createRemoteAuthInfoFetch(builtInServer, fetchFn)(remoteUrl);
    expect(sent[0]?.init?.headers).toEqual({
      authorization: "Bearer launch-token",
    });
  });

  it("resolves with what the remote offers", async () => {
    const { fetchFn } = answering(200, offer);
    expect(
      await createRemoteAuthInfoFetch(builtInServer, fetchFn)(remoteUrl),
    ).toEqual({ ok: true, data: offer });
  });

  it("resolves as a network failure when the remote cannot be reached", async () => {
    const { fetchFn } = answering(502, {
      code: "remote_unreachable",
      message: "connection refused",
    });
    expect(
      await createRemoteAuthInfoFetch(builtInServer, fetchFn)(remoteUrl),
    ).toEqual({
      ok: false,
      error: { status: "NETWORK", message: "connection refused" },
    });
  });

  it("resolves as unreadable when the remote did not answer as an easyImmerse server does", async () => {
    const { fetchFn } = answering(502, {
      code: "remote_failed",
      message: "the remote answered 404",
    });
    expect(
      await createRemoteAuthInfoFetch(builtInServer, fetchFn)(remoteUrl),
    ).toEqual({
      ok: false,
      error: { status: "NO_DATA", message: "the remote answered 404" },
    });
  });

  it("keeps the built-in server's refusal of an address", async () => {
    const { fetchFn } = answering(400, {
      code: "invalid_server_url",
      message: "not an http address",
    });
    expect(
      await createRemoteAuthInfoFetch(builtInServer, fetchFn)(remoteUrl),
    ).toEqual({
      ok: false,
      error: {
        status: 400,
        code: "invalid_server_url",
        message: "not an http address",
      },
    });
  });
});
