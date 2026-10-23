import type { BackendResult } from "@easyimmerse/backend";
import { describe, expect, it } from "vitest";
import { createDictionaryMediaListener } from "./dictionaryMediaListener.ts";
import type { DictionaryMedia } from "./fetchDictionaryMediaMessage.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };
const message = {
  kind: "fetchDictionaryMedia",
  dictionaryId: "d1",
  path: "images/cat.png",
};

/** Sends the message to a listener over the fetch, and resolves with its answer. */
function sendToListener(
  fetchFn: typeof fetch,
): Promise<BackendResult<DictionaryMedia>> {
  const listener = createDictionaryMediaListener(async () => server, fetchFn);
  return new Promise((resolve) => listener(message, {}, resolve));
}

const answerPng: typeof fetch = async () =>
  new Response(new Uint8Array([137, 80, 78, 71]), {
    headers: { "content-type": "image/png" },
  });

describe("createDictionaryMediaListener", () => {
  it("answers with the file's bytes in base64 and its type", async () => {
    expect(await sendToListener(answerPng)).toEqual({
      data: { base64: "iVBORw==", contentType: "image/png" },
    });
  });

  it("asks for the file at the media route, without the token in the address", async () => {
    const urls: string[] = [];
    await sendToListener(async (input, init) => {
      urls.push(new Request(input, init).url);
      return answerPng(input, init);
    });
    expect(urls).toEqual([
      "http://127.0.0.1:8787/dictionaries/d1/media/images%2Fcat.png",
    ]);
  });

  it("sends the token in a header", async () => {
    const headers: (string | null)[] = [];
    await sendToListener(async (input, init) => {
      headers.push(new Request(input, init).headers.get("authorization"));
      return answerPng(input, init);
    });
    expect(headers).toEqual(["Bearer secret"]);
  });

  it("answers with the server's error when there is no such file", async () => {
    const answer = await sendToListener(
      async () => new Response("", { status: 404 }),
    );
    expect("error" in answer && answer.error.status).toBe(404);
  });

  describe("with a rasterizer of SVG images", () => {
    const answerSvg: typeof fetch = async () =>
      new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } });

    /** Sends the message to a listener that rasterizes SVG images with `rasterizeSvg`, over the fetch. */
    function sendToRasterizingListener(
      fetchFn: typeof fetch,
      rasterizeSvg = async () => new Uint8Array([137, 80, 78, 71]),
    ): Promise<BackendResult<DictionaryMedia>> {
      const listener = createDictionaryMediaListener(
        async () => server,
        fetchFn,
        rasterizeSvg,
      );
      return new Promise((resolve) => listener(message, {}, resolve));
    }

    it("answers an SVG image as the PNG it draws", async () => {
      expect(await sendToRasterizingListener(answerSvg)).toEqual({
        data: { base64: "iVBORw==", contentType: "image/png" },
      });
    });

    it("answers other images as they are", async () => {
      expect(await sendToRasterizingListener(answerPng)).toEqual({
        data: { base64: "iVBORw==", contentType: "image/png" },
      });
    });

    it("answers an SVG image as it is when it cannot be drawn", async () => {
      const answer = await sendToRasterizingListener(answerSvg, async () => {
        throw new Error("No canvas.");
      });
      expect("data" in answer && answer.data.contentType).toBe("image/svg+xml");
    });
  });
});
