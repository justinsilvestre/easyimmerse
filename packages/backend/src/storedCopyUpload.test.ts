import { createBrowserFileRegistry } from "@easyimmerse/state";
import type { MediaFileSource } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { BackendRequest } from "./backendClient.ts";
import { createFakeAnkiConnect } from "./fakeAnkiConnect.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { uploadStoredCopy } from "./storedCopyUpload.ts";

const film = new File(["bytes"], "film.mkv", { lastModified: 7 });

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

const filmSource: MediaFileSource = {
  kind: "browser_file",
  size: film.size,
  last_modified_ms: 7,
};

/** Uploads the film from a browser that holds the given file, and returns the requests sent and the result. */
async function upload(held: File | null) {
  const requests: BackendRequest[] = [];
  const result = await uploadStoredCopy(
    {
      projectId: "p1",
      mediaFileId: "m1",
      file: { name: "film.mkv", source: filmSource },
    },
    extraHolding(held),
    (request) => {
      requests.push(request);
      return { data: undefined };
    },
  );
  return { requests, result };
}

describe("uploadStoredCopy", () => {
  it("puts the file the browser holds as the body", async () => {
    const { requests } = await upload(film);
    expect(requests).toEqual([
      {
        method: "PUT",
        path: "/projects/p1/media/m1/stored-copy",
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
