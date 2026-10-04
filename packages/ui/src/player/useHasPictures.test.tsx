import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createFakeFrameCapturer } from "../testSupport/createFakeFrameCapturer.ts";
import type { FrameCapturer } from "./browserFrameCapturer.ts";
import { FrameCapturerContext } from "./frameCapturerContext.ts";
import { useHasPictures } from "./useHasPictures.ts";

afterEach(cleanup);

function Pictures({ file }: { file: Blob | null }) {
  return <output>{String(useHasPictures(file))}</output>;
}

function renderPictures(file: Blob | null, capturer: FrameCapturer) {
  render(
    <FrameCapturerContext value={capturer}>
      <Pictures file={file} />
    </FrameCapturerContext>,
  );
}

const shownAnswer = () => screen.getByRole("status").textContent;

const settle = () => act(async () => undefined);

describe("useHasPictures", () => {
  it("knows nothing before the file is probed", () => {
    renderPictures(new Blob(["video"]), createFakeFrameCapturer(true));
    expect(shownAnswer()).toBe("undefined");
  });

  it("finds pictures once the file is probed", async () => {
    renderPictures(new Blob(["video"]), createFakeFrameCapturer(true));
    await settle();
    expect(shownAnswer()).toBe("true");
  });

  it("finds no pictures in a file without them", async () => {
    renderPictures(new Blob(["audio"]), createFakeFrameCapturer(false));
    await settle();
    expect(shownAnswer()).toBe("false");
  });

  it("knows nothing without a file", async () => {
    renderPictures(null, createFakeFrameCapturer(true));
    await settle();
    expect(shownAnswer()).toBe("undefined");
  });
});
