import { describe, expect, it } from "vitest";
import { createServerFetch } from "./serverFetch.ts";

describe("createServerFetch", () => {
  it("fetches the path from the server with the bearer token", async () => {
    const calls: { url: string; headers: unknown }[] = [];
    const serverFetch = createServerFetch(
      { serverUrl: "http://localhost:4000", token: "secret" },
      async (url, init) => {
        calls.push({ url: String(url), headers: init?.headers });
        return new Response();
      },
    );
    await serverFetch("/projects/p1/media/m1/clip", {
      headers: { "content-type": "application/json" },
    });
    expect(calls).toEqual([
      {
        url: "http://localhost:4000/api/projects/p1/media/m1/clip",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer secret",
        },
      },
    ]);
  });
});
