import { describe, expect, it } from "vitest";
import { exportAnkiPackage } from "./ankiPackageExport.ts";
import type { BackendRequest } from "./backendClient.ts";
import type { ServerFetch } from "./serverFetch.ts";

const args = {
  projectId: "p1",
  flashcardIds: ["f1", "f2"],
  marksExported: true,
};

const packageResponse = () =>
  new Response(new Uint8Array([80, 75]), {
    headers: {
      "content-disposition": `attachment; filename="Korean.apkg"; filename*=UTF-8''%ED%95%9C.apkg`,
      "x-easyimmerse-flashcard-count": "1",
      "x-easyimmerse-skipped-media": "3",
    },
  });

/** A server fetch that records each call and answers with the response given. */
function createRecordingFetch(respond: () => Response) {
  const calls: { path: string; init?: RequestInit }[] = [];
  const serverFetch: ServerFetch = async (path, init) => {
    calls.push({ path, init });
    return respond();
  };
  return { calls, serverFetch };
}

const unusedServer = async (): Promise<never> => {
  throw new Error("No JSON request is expected.");
};

function download(respond: () => Response = packageResponse) {
  const { calls, serverFetch } = createRecordingFetch(respond);
  const exported = exportAnkiPackage(
    { ...args, savePath: null },
    { server: unusedServer, serverFetch },
  );
  return { calls, exported };
}

describe("exportAnkiPackage", () => {
  it("asks the server for the package's bytes when there is no save path", async () => {
    const { calls, exported } = download();
    await exported;
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        flashcard_ids: ["f1", "f2"],
        save_path: null,
        marks_exported: true,
      }),
    );
  });

  it("hands back the package's bytes, named by the server", async () => {
    expect(await download().exported).toEqual({
      data: {
        kind: "downloaded",
        fileName: "한.apkg",
        bytes: new Uint8Array([80, 75]),
        flashcardCount: 1,
        skippedMediaCount: 3,
      },
    });
  });

  it("counts the flashcards the server packaged rather than those asked for", async () => {
    expect(await download().exported).toMatchObject({
      data: { flashcardCount: 1 },
    });
  });

  it("fails as the server says when it refuses the export", async () => {
    const { exported } = download(() =>
      Response.json(
        { code: "not_found", message: "no such flashcard" },
        { status: 404 },
      ),
    );
    expect(await exported).toEqual({
      error: { status: 404, code: "not_found", message: "no such flashcard" },
    });
  });

  it("needs a server to download from", async () => {
    const exported = await exportAnkiPackage(
      { ...args, savePath: null },
      { server: unusedServer, serverFetch: null },
    );
    expect(exported).toMatchObject({ error: { status: "OFFLINE" } });
  });

  it("asks the server to write the package at the save path", async () => {
    const requests: BackendRequest[] = [];
    await exportAnkiPackage(
      { ...args, savePath: "/decks/Korean.apkg" },
      {
        server: async (request) => {
          requests.push(request);
          return {
            data: {
              flashcard_count: 2,
              skipped_media_count: 0,
            },
          };
        },
        serverFetch: null,
      },
    );
    expect(requests).toEqual([
      {
        method: "POST",
        path: "/projects/p1/anki/package",
        body: {
          kind: "json",
          value: {
            flashcard_ids: ["f1", "f2"],
            save_path: "/decks/Korean.apkg",
            marks_exported: true,
          },
        },
      },
    ]);
  });

  it("tells what the server wrote at the save path", async () => {
    const exported = await exportAnkiPackage(
      { ...args, savePath: "/decks/Korean.apkg" },
      {
        server: async () => ({
          data: {
            flashcard_count: 2,
            skipped_media_count: 1,
          },
        }),
        serverFetch: null,
      },
    );
    expect(exported).toEqual({
      data: {
        kind: "saved",
        flashcardCount: 2,
        skippedMediaCount: 1,
      },
    });
  });
});
