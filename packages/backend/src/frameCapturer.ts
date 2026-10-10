/** Draws frames from files the browser holds, one file operation at a time. */
export type FrameCapturer = {
  /**
   * Captures the frame at the time as an image URL, or null when the file shows no pictures or the frame cannot be drawn.
   * Resolves undefined without capturing when a capture of the same file at another time is asked for before this one's turn.
   */
  capture: (file: Blob, atMs: number) => Promise<string | null | undefined>;
  /** Opens the file to learn whether it shows pictures. */
  probe: (file: Blob) => Promise<boolean>;
};
