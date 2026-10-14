import type { AnkiNote } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { createMediaFetch, mediaPath, withoutMedia } from "./ankiMedia.ts";

const audio = {
  kind: "audio",
  file_name: "f1.m4a",
  media_file_id: "m1",
  start_ms: 1000,
  end_ms: 2500,
} as const;

const screenshot = {
  kind: "screenshot",
  file_name: "f1.jpg",
  media_file_id: "m1",
  at_ms: 1200,
} as const;

describe("mediaPath", () => {
  it("cuts an audio clip from its start to its end", () => {
    expect(mediaPath("p1", audio)).toBe(
      "/projects/p1/media/m1/clip?start_ms=1000&end_ms=2500",
    );
  });

  it("takes a screenshot at its time", () => {
    expect(mediaPath("p1", screenshot)).toBe(
      "/projects/p1/media/m1/frame?at_ms=1200",
    );
  });
});

describe("createMediaFetch", () => {
  it("resolves the bytes the server answers with", async () => {
    const fetchMedia = createMediaFetch(async () => new Response("clip"));
    const bytes = await fetchMedia("p1", audio);
    expect(new TextDecoder().decode(bytes ?? undefined)).toBe("clip");
  });

  it("finds nothing when the server cannot render the media", async () => {
    const fetchMedia = createMediaFetch(
      async () => new Response(null, { status: 503 }),
    );
    expect(await fetchMedia("p1", audio)).toBeNull();
  });

  it("finds nothing when the server does not answer", async () => {
    const fetchMedia = createMediaFetch(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    );
    expect(await fetchMedia("p1", audio)).toBeNull();
  });

  it("finds nothing without a server", async () => {
    expect(await createMediaFetch(null)("p1", audio)).toBeNull();
  });
});

describe("withoutMedia", () => {
  const note: AnkiNote = {
    flashcard_id: "f1",
    guid: "guid",
    note_id: 1,
    updated_at_ms: 1,
    fields: ["Katze", "[sound:f1.m4a]", '<img src="f1.jpg">', "f1"],
    tags: [],
    media: [audio, screenshot],
  };

  it("empties the field that named the file", () => {
    expect(withoutMedia(note, screenshot).fields).toEqual([
      "Katze",
      "[sound:f1.m4a]",
      "",
      "f1",
    ]);
  });

  it("keeps the other media", () => {
    expect(withoutMedia(note, screenshot).media).toEqual([audio]);
  });
});
