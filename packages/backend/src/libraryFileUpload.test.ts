import { createBrowserFileRegistry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import type { BackendRequest } from "./backendClient.ts";
import { createFakeAnkiConnect } from "./fakeAnkiConnect.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { uploadLibraryFile } from "./libraryFileUpload.ts";

const film = new File(["bytes"], "park.mp4", { lastModified: 7 });

/** The thunk extra of a browser that holds the film, or holds nothing. */
function extraHolding(file: File | null): BackendThunkExtra {
  const browserFileRegistry = createBrowserFileRegistry<File>();
  if (file !== null) browserFileRegistry.register(file);
  return {
    client: { send: async <T>() => ({ data: undefined as T }) },
    browserFileRegistry,
    frameCapturer: null,
    failedPassages: { retryTimes: {} },
    serverFetch: null,
    ankiConnect: createFakeAnkiConnect(),
  };
}

/** Uploads the film as item i1's file from a browser that holds the given file, and returns the requests sent and the result. */
async function upload(held: File | null) {
  const requests: BackendRequest[] = [];
  const source = {
    kind: "browser_file",
    size: film.size,
    last_modified_ms: 7,
  } as const;
  const result = await uploadLibraryFile(
    { itemId: "i1", file: { name: "park.mp4", source } },
    extraHolding(held),
    (request) => {
      requests.push(request);
      return { data: undefined };
    },
  );
  return { requests, result };
}

describe("uploadLibraryFile", () => {
  it("puts the file the browser holds as the body, with its name", async () => {
    const { requests } = await upload(film);
    expect(requests).toEqual([
      {
        method: "PUT",
        path: "/library/items/i1/file",
        query: { file_name: "park.mp4" },
        body: {
          kind: "bytes",
          value: film,
          contentType: "application/octet-stream",
        },
      },
    ]);
  });

  it("fails without sending anything when the browser no longer holds the file", async () => {
    const { result } = await upload(null);
    expect(result).toMatchObject({ error: { code: "browserFileGone" } });
  });
});
