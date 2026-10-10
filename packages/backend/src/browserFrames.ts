import type { QueryReturnValue } from "@reduxjs/toolkit/query";
import type { BackendError } from "./backendClient.ts";
import type { FrameCapturer } from "./frameCapturer.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import {
  browserFileUnreachable,
  findPickedFile,
  type PickedFile,
} from "./readPickedFile.ts";

/** A frame to capture: the picked file and the time in it. */
export type FrameArgs = { file: PickedFile; atMs: number };

/** A captured frame as an image URL, or null when the file shows no pictures or the frame cannot be drawn, with the file it comes from. */
export type CapturedFrame = { file: PickedFile; url: string | null };

/** The failure for a capture skipped because a capture of the same file at another time was asked for after it. */
const frameCaptureSuperseded: BackendError = {
  status: 409,
  code: "frameCaptureSuperseded",
  message: "A capture at another time replaced this one.",
};

/** Captures a frame of a file the browser holds. */
export async function captureFrame(
  { file, atMs }: FrameArgs,
  extra: BackendThunkExtra,
): Promise<QueryReturnValue<CapturedFrame, BackendError, undefined>> {
  const found = findCapturable(file, extra);
  if ("error" in found) return found;
  const url = await found.capturer.capture(found.file, atMs);
  return url === undefined
    ? { error: frameCaptureSuperseded }
    : { data: { file, url } };
}

/** Opens a file the browser holds to learn whether it shows pictures. */
export async function probePictures(
  file: PickedFile,
  extra: BackendThunkExtra,
): Promise<QueryReturnValue<boolean, BackendError, undefined>> {
  const found = findCapturable(file, extra);
  if ("error" in found) return found;
  return { data: await found.capturer.probe(found.file) };
}

function findCapturable(
  file: PickedFile,
  { browserFileRegistry, frameCapturer }: BackendThunkExtra,
): { file: File; capturer: FrameCapturer } | { error: BackendError } {
  if (frameCapturer === null) return { error: browserFileUnreachable };
  const found = findPickedFile(file, browserFileRegistry);
  return "error" in found ? found : { ...found, capturer: frameCapturer };
}
