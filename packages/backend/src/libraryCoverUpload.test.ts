import { createBrowserFileRegistry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import type { BackendRequest } from "./backendClient.ts";
import { createFakeAnkiConnect } from "./fakeAnkiConnect.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { uploadLibraryCover } from "./libraryCoverUpload.ts";

const picture = new File(["bytes"], "cover.png", { lastModified: 7 });

/** The thunk extra of a browser that holds the picture. */
function extraHoldingPicture(): BackendThunkExtra {
  const browserFileRegistry = createBrowserFileRegistry<File>();
  browserFileRegistry.register(picture);
  return {
    client: { send: async <T>() => ({ data: undefined as T }) },
    browserFileRegistry,
    frameCapturer: null,
    failedPassages: { retryTimes: {} },
    serverFetch: null,
    ankiConnect: createFakeAnkiConnect(),
  };
}

describe("uploadLibraryCover", () => {
  it("puts the picture the browser holds as the body", async () => {
    const requests: BackendRequest[] = [];
    const source = {
      kind: "browser_file",
      size: picture.size,
      last_modified_ms: 7,
    } as const;
    await uploadLibraryCover(
      { itemId: "i1", file: { name: "cover.png", source } },
      extraHoldingPicture(),
      (request) => {
        requests.push(request);
        return { data: undefined };
      },
    );
    expect(requests).toEqual([
      {
        method: "PUT",
        path: "/library/items/i1/cover",
        body: {
          kind: "bytes",
          value: picture,
          contentType: "application/octet-stream",
        },
      },
    ]);
  });
});
