import { describe, expect, it } from "vitest";
import { createPageMedia } from "./pageMedia.ts";

/** A decoded picture that records whether it was closed. */
function createFakePicture() {
  const picture = { width: 2, height: 2, isClosed: false };
  return Object.assign(picture, {
    close: () => {
      picture.isClosed = true;
    },
  }) as unknown as ImageBitmap & { isClosed: boolean };
}

/** Builds page media over a fetch that answers with `answer`, recording the files fetched and loads reported, and decoding every file into `picture`. */
function createRecordedMedia(
  picture = createFakePicture(),
  answer: () => Promise<Blob | null> = async () => new Blob(["png"]),
) {
  const record = { fetched: [] as string[], loads: 0 };
  const media = createPageMedia({
    fetchMedia: (dictionaryId, path) => {
      record.fetched.push(`${dictionaryId}/${path}`);
      return answer();
    },
    onLoad: () => {
      record.loads += 1;
    },
    decode: async () => picture,
  });
  return { media, record, picture };
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe("createPageMedia", () => {
  it("resolves nothing until the file has loaded", () => {
    const { media } = createRecordedMedia();
    expect(media.resolver()("d1", "cat.png")).toBeNull();
  });

  it("resolves a loaded file to its decoded picture", async () => {
    const { media, picture } = createRecordedMedia();
    media.resolver()("d1", "cat.png");
    await settle();
    expect(media.resolver()("d1", "cat.png")).toBe(picture);
  });

  it("reports each file that loads", async () => {
    const { media, record } = createRecordedMedia();
    media.resolver()("d1", "cat.png");
    await settle();
    expect(record.loads).toBe(1);
  });

  it("fetches each file once", async () => {
    const { media, record } = createRecordedMedia();
    media.resolver()("d1", "cat.png");
    media.resolver()("d1", "cat.png");
    await settle();
    media.resolver()("d1", "cat.png");
    expect(record.fetched).toEqual(["d1/cat.png"]);
  });

  it("gives a new resolver once a file has loaded", async () => {
    const { media } = createRecordedMedia();
    const before = media.resolver();
    before("d1", "cat.png");
    await settle();
    expect(media.resolver()).not.toBe(before);
  });

  it("resolves nothing for a file that could not be fetched", async () => {
    const { media } = createRecordedMedia(undefined, async () => null);
    media.resolver()("d1", "cat.png");
    await settle();
    expect(media.resolver()("d1", "cat.png")).toBeNull();
  });

  it("closes the pictures it decoded when it forgets them", async () => {
    const { media, picture } = createRecordedMedia();
    media.resolver()("d1", "cat.png");
    await settle();
    media.forget();
    expect(picture.isClosed).toBe(true);
  });

  it("closes a picture that loads after it forgot", async () => {
    const { media, picture } = createRecordedMedia();
    media.resolver()("d1", "cat.png");
    media.forget();
    await settle();
    expect(picture.isClosed).toBe(true);
  });

  it("does not report a picture that loads after it forgot", async () => {
    const { media, record } = createRecordedMedia();
    media.resolver()("d1", "cat.png");
    media.forget();
    await settle();
    expect(record.loads).toBe(0);
  });
});
