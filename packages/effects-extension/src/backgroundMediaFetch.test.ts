import { describe, expect, it } from "vitest";
import { createBackgroundMediaFetch } from "./backgroundMediaFetch.ts";

const answerPng = async () => ({
  data: { base64: "iVBORw==", contentType: "image/png" },
});

describe("createBackgroundMediaFetch", () => {
  it("gives the file the answer's type", async () => {
    const fetchMedia = createBackgroundMediaFetch(answerPng);
    const blob = await fetchMedia("d1", "cat.png");
    expect(blob?.type).toBe("image/png");
  });

  it("decodes the answer's bytes", async () => {
    const fetchMedia = createBackgroundMediaFetch(answerPng);
    const blob = await fetchMedia("d1", "cat.png");
    const bytes = new Uint8Array(
      (await blob?.arrayBuffer()) ?? new ArrayBuffer(0),
    );
    expect([...bytes]).toEqual([137, 80, 78, 71]);
  });

  it("resolves with null when the file could not be fetched", async () => {
    const fetchMedia = createBackgroundMediaFetch(async () => ({
      error: { status: 404, message: "Not Found" },
    }));
    expect(await fetchMedia("d1", "cat.png")).toBeNull();
  });
});
