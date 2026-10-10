/** Draws frames from files the browser holds, one file operation at a time. */
export type FrameCapturer = {
  /**
   * Captures the frame at the time as an image URL, or null when the file shows no pictures or the frame cannot be drawn.
   * Resolves undefined without capturing when `isAbandoned` answers true at the capture's turn.
   */
  capture: (
    file: Blob,
    atMs: number,
    isAbandoned: () => boolean,
  ) => Promise<string | null | undefined>;
  /** Opens the file to learn whether it shows pictures. */
  probe: (file: Blob) => Promise<boolean>;
};
