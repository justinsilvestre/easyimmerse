import { describe, expect, it } from "vitest";
import { createFakeBackendClient } from "./createFakeBackendClient.ts";
import { fixtureMediaFiles, fixtureResponses } from "./fixtureResponses.ts";

describe("createFakeBackendClient", () => {
  it("answers a canned path with its response", async () => {
    const client = createFakeBackendClient(fixtureResponses);
    expect(
      await client.send({ method: "GET", path: "/projects/p1/media" }),
    ).toEqual({ data: fixtureMediaFiles });
  });

  it("answers an unknown path with a 404", async () => {
    const client = createFakeBackendClient({});
    expect(await client.send({ method: "GET", path: "/nowhere" })).toEqual({
      error: { status: 404, message: "No canned GET /nowhere" },
    });
  });

  it("lists no alignments for a media file by default", async () => {
    const client = createFakeBackendClient({});
    expect(
      await client.send({
        method: "GET",
        path: "/projects/p1/media/m1/alignments",
      }),
    ).toEqual({ data: { alignments: [] } });
  });

  it("prefers a canned alignment list over the default", async () => {
    const client = createFakeBackendClient({
      "GET /projects/p1/media/m1/alignments": { alignments: ["canned"] },
    });
    expect(
      await client.send({
        method: "GET",
        path: "/projects/p1/media/m1/alignments",
      }),
    ).toEqual({ data: { alignments: ["canned"] } });
  });

  it("answers a translation document with the listed media file paired to it", async () => {
    const client = createFakeBackendClient(fixtureResponses);
    expect(
      await client.send({
        method: "PUT",
        path: "/projects/p1/media/m1/translation-document",
        body: { kind: "json", value: { translation_media_file_id: "m2" } },
      }),
    ).toEqual({
      data: {
        ...fixtureMediaFiles.media_files[0],
        translation_media_file_id: "m2",
      },
    });
  });

  it("answers a translation document of an unlisted media file with a 404", async () => {
    const client = createFakeBackendClient(fixtureResponses);
    const result = await client.send({
      method: "PUT",
      path: "/projects/p1/media/missing/translation-document",
      body: { kind: "json", value: { translation_media_file_id: null } },
    });
    expect(result).toMatchObject({ error: { status: 404 } });
  });
});
