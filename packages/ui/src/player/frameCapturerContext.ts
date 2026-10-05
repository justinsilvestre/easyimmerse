import { createContext, useContext } from "react";
import {
  browserFrameCapturer,
  type FrameCapturer,
} from "./browserFrameCapturer.ts";

/** The capturer that draws frames from files the browser holds. Tests provide one with a fake platform. */
export const FrameCapturerContext =
  createContext<FrameCapturer>(browserFrameCapturer);

export function useFrameCapturer(): FrameCapturer {
  return useContext(FrameCapturerContext);
}
