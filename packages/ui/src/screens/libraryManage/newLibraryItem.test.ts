import { describe, expect, it } from "vitest";
import { newLibraryItemOf } from "./newLibraryItem.ts";

function formWith(fields: Record<string, string | File>) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

const languages = { language: "de", translationLanguage: "en" };
const video = new File(["v"], "park.mp4", { type: "video/mp4" });
const subtitles = new File(["s"], "park.srt");

describe("newLibraryItemOf", () => {
  it("makes a video item of a video file with its subtitles", () => {
    const form = formWith({ ...languages, media: video, subtitles });
    expect(newLibraryItemOf(form, "media")?.draft.kind).toBe("video");
  });

  it("makes an audio item of an audio file", () => {
    const audio = new File(["a"], "news.mp3", { type: "audio/mpeg" });
    const form = formWith({ ...languages, media: audio, subtitles });
    expect(newLibraryItemOf(form, "media")?.draft.kind).toBe("audio");
  });

  it("makes a document item of a text file", () => {
    const text = new File(["t"], "story.txt", { type: "text/plain" });
    const form = formWith({ ...languages, text });
    expect(newLibraryItemOf(form, "text")?.draft.kind).toBe("document");
  });

  it("names the item after its file when no title is given", () => {
    const form = formWith({ ...languages, media: video, subtitles });
    expect(newLibraryItemOf(form, "media")?.draft.title).toBe("park.mp4");
  });

  it("needs the subtitles of a video or audio file", () => {
    const form = formWith({ ...languages, media: video });
    expect(newLibraryItemOf(form, "media")).toBeNull();
  });
});
