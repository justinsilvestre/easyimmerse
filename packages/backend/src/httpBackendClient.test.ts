import { describe, expect, it } from "vitest";
import { createHttpBackendClient } from "./httpBackendClient.ts";

type RecordedFetch = typeof fetch & { requests: Request[] };

function createFakeFetch(respond: () => Response): RecordedFetch {
  const requests: Request[] = [];
  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return respond();
  };
  return Object.assign(fakeFetch, { requests });
}

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function createClient(fakeFetch: RecordedFetch) {
  return createHttpBackendClient({
    serverUrl: "http://127.0.0.1:8787",
    token: "secret",
    fetch: fakeFetch,
  });
}

describe("createHttpBackendClient", () => {
  it("passes the abort signal on to the request", async () => {
    const signals: (AbortSignal | null | undefined)[] = [];
    const fakeFetch = Object.assign(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        signals.push(init?.signal);
        return jsonResponse(200, {});
      },
      { requests: [] },
    );
    const controller = new AbortController();
    await createClient(fakeFetch).send(
      { method: "GET", path: "/projects" },
      controller.signal,
    );
    expect(signals).toEqual([controller.signal]);
  });

  it("sends the bearer token in the Authorization header", async () => {
    const fakeFetch = createFakeFetch(() =>
      jsonResponse(200, { projects: [] }),
    );
    await createClient(fakeFetch).send({ method: "GET", path: "/projects" });
    expect(fakeFetch.requests[0]?.headers.get("authorization")).toBe(
      "Bearer secret",
    );
  });

  it("joins the path and query onto the server URL", async () => {
    const fakeFetch = createFakeFetch(() => jsonResponse(200, {}));
    await createClient(fakeFetch).send({
      method: "POST",
      path: "/documents/parse",
      query: { format: "epub" },
    });
    expect(fakeFetch.requests[0]?.url).toBe(
      "http://127.0.0.1:8787/documents/parse?format=epub",
    );
  });

  it("returns the parsed JSON body as data", async () => {
    const fakeFetch = createFakeFetch(() =>
      jsonResponse(200, { projects: [] }),
    );
    const result = await createClient(fakeFetch).send({
      method: "GET",
      path: "/projects",
    });
    expect(result).toEqual({ data: { projects: [] } });
  });

  it("returns undefined data for a 204 response", async () => {
    const fakeFetch = createFakeFetch(
      () => new Response(null, { status: 204 }),
    );
    const result = await createClient(fakeFetch).send({
      method: "PUT",
      path: "/preferences/showTranslations",
      body: { kind: "json", value: { value: "true" } },
    });
    expect(result).toEqual({ data: undefined });
  });

  it("sends a JSON body with the JSON content type", async () => {
    const fakeFetch = createFakeFetch(
      () => new Response(null, { status: 204 }),
    );
    await createClient(fakeFetch).send({
      method: "PUT",
      path: "/preferences/showTranslations",
      body: { kind: "json", value: { value: "true" } },
    });
    expect(fakeFetch.requests[0]?.headers.get("content-type")).toBe(
      "application/json",
    );
  });

  it("keeps the content type of a raw body", async () => {
    const fakeFetch = createFakeFetch(() => jsonResponse(201, {}));
    await createClient(fakeFetch).send({
      method: "POST",
      path: "/dictionaries",
      body: {
        kind: "bytes",
        value: new Uint8Array([1, 2, 3]),
        contentType: "application/zip",
      },
    });
    expect(fakeFetch.requests[0]?.headers.get("content-type")).toBe(
      "application/zip",
    );
  });

  it("maps the ApiError body of a 401 response to an error code", async () => {
    const fakeFetch = createFakeFetch(() =>
      jsonResponse(401, { code: "unauthorized", message: "Bad token" }),
    );
    const result = await createClient(fakeFetch).send({
      method: "GET",
      path: "/projects",
    });
    expect(result).toEqual({
      error: { status: 401, code: "unauthorized", message: "Bad token" },
    });
  });

  it("uses the status text when an error response has no ApiError body", async () => {
    const fakeFetch = createFakeFetch(
      () =>
        new Response("gateway down", {
          status: 502,
          statusText: "Bad Gateway",
        }),
    );
    const result = await createClient(fakeFetch).send({
      method: "GET",
      path: "/projects",
    });
    expect(result).toEqual({ error: { status: 502, message: "Bad Gateway" } });
  });

  it("reports a NETWORK error when fetch rejects", async () => {
    const failingFetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    const client = createHttpBackendClient({
      serverUrl: "http://127.0.0.1:8787",
      token: "secret",
      fetch: failingFetch as typeof fetch,
    });
    const result = await client.send({ method: "GET", path: "/projects" });
    expect(result).toEqual({
      error: { status: "NETWORK", message: "Failed to fetch" },
    });
  });
});
