import { useEffect, useReducer } from "react";
import { useFrameCapturer } from "./frameCapturerContext.ts";

/**
 * Whether a file the browser holds shows pictures, learned by opening it in the background.
 * Undefined without a file or until the file has been opened.
 */
export function useHasPictures(file: Blob | null): boolean | undefined {
  const capturer = useFrameCapturer();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    if (file === null || capturer.peekPictures(file) !== undefined) return;
    const controller = new AbortController();
    capturer.probe(file, controller.signal).then(() => {
      if (!controller.signal.aborted) rerender();
    });
    return () => controller.abort();
  }, [file, capturer]);
  return file === null ? undefined : capturer.peekPictures(file);
}
