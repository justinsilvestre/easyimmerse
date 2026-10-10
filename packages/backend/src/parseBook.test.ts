import { createBrowserFileRegistry } from "@easyimmerse/state";
import type { MediaFileSource } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { BackendRequest } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { parseBook } from "./parseBook.ts";

const parsed = { title: "Sample", language: null, chapters: [] };

const onDisk = {
  name: "sample.epub",
  source: { kind: "path", path: "/books/sample.epub" } as MediaFileSource,
};

function recordingBaseQuery() {
  const requests: BackendRequest[] = [];
  const baseQuery = async (request: BackendRequest) => {
    requests.push(request);
    return { data: parsed };
  };
  return { requests, baseQuery };
}

function extraWith(
  browserFileRegistry: BackendThunkExtra["browserFileRegistry"],
): BackendThunkExtra {
  return {
    client: { send: async () => ({ data: null as never }) },
    browserFileRegistry,
    failedPassages: { retryTimes: {} },
  };
}

function heldFile() {
  const registry = createBrowserFileRegistry<File>();
  const file = new File(["The cat sat."], "notes.txt", { lastModified: 5 });
  return {
    registry,
    book: { name: "notes.txt", source: registry.register(file) },
  };
}

describe("parseBook", () => {
  it("has the server parse a file on its disk, in the format its name gives", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    await parseBook(onDisk, extraWith(null), baseQuery);
    expect(requests).toEqual([
      {
        method: "POST",
        path: "/documents/parse-local",
        body: {
          kind: "json",
          value: { path: "/books/sample.epub", format: "epub" },
        },
      },
    ]);
  });

  it("returns the parsed book", async () => {
    const { baseQuery } = recordingBaseQuery();
    expect(await parseBook(onDisk, extraWith(null), baseQuery)).toEqual({
      data: parsed,
    });
  });

  it("sends the bytes of a file the browser holds", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const { registry, book } = heldFile();
    await parseBook(book, extraWith(registry), baseQuery);
    const body = requests[0]?.body;
    expect(
      body?.kind === "bytes" &&
        new TextDecoder().decode(body.value as Uint8Array),
    ).toBe("The cat sat.");
  });

  it("puts the format in the query string for a file the browser holds", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const { registry, book } = heldFile();
    await parseBook(book, extraWith(registry), baseQuery);
    expect(requests[0]?.query).toEqual({ format: "plain_text" });
  });

  it("carries the offline operation for a file the browser holds", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const { registry, book } = heldFile();
    await parseBook(book, extraWith(registry), baseQuery);
    expect(requests[0]?.offlineOperation).toMatchObject({
      kind: "parseDocument",
      format: "plain_text",
    });
  });

  it("fails for a browser file on a platform that holds none", async () => {
    const { baseQuery } = recordingBaseQuery();
    const { book } = heldFile();
    expect(await parseBook(book, extraWith(null), baseQuery)).toMatchObject({
      error: { code: "browserFileUnreachable" },
    });
  });

  it("fails for a browser file that is no longer open", async () => {
    const { baseQuery } = recordingBaseQuery();
    const { book } = heldFile();
    expect(
      await parseBook(
        book,
        extraWith(createBrowserFileRegistry<File>()),
        baseQuery,
      ),
    ).toMatchObject({ error: { code: "browserFileGone" } });
  });
});
