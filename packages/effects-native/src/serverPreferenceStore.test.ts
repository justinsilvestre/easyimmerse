import { describe, expect, it, vi } from "vitest";
import { createServerPreferenceStore } from "./serverPreferenceStore.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

function fakeFetch(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("createServerPreferenceStore", () => {
  it("saves with a PUT to the preference's route", async () => {
    const fetchFn = fakeFetch(new Response(null, { status: 204 }));
    await createServerPreferenceStore(server, fetchFn).save("a b", "1");
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:8787/preferences/a%20b",
    );
  });

  it("saves the value as a JSON body", async () => {
    const fetchFn = fakeFetch(new Response(null, { status: 204 }));
    await createServerPreferenceStore(server, fetchFn).save("key", "1");
    expect(fetchFn.mock.calls[0]?.[1]).toMatchObject({
      method: "PUT",
      body: '{"value":"1"}',
    });
  });

  it("sends the bearer token", async () => {
    const fetchFn = fakeFetch(new Response(null, { status: 204 }));
    await createServerPreferenceStore(server, fetchFn).save("key", "1");
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: "Bearer secret",
    });
  });

  it("loads the stored value", async () => {
    const fetchFn = fakeFetch(jsonResponse({ value: "true" }));
    const loaded = await createServerPreferenceStore(server, fetchFn).load("k");
    expect(loaded).toBe("true");
  });

  it("loads null for a preference that was never saved", async () => {
    const fetchFn = fakeFetch(jsonResponse({ value: null }));
    const loaded = await createServerPreferenceStore(server, fetchFn).load("k");
    expect(loaded).toBeNull();
  });

  it("rejects when the server answers with an error", async () => {
    const fetchFn = fakeFetch(new Response("nope", { status: 401 }));
    const store = createServerPreferenceStore(server, fetchFn);
    await expect(store.load("k")).rejects.toThrow("401");
  });
});
