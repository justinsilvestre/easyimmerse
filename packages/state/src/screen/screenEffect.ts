/** The side effects that the screens ask for: the player's requests, the platform's file pickers, and the measure of its media support. */
export type ScreenEffect =
  | { type: "seekPlayer"; seconds: number }
  | { type: "togglePlayer" }
  | { type: "playPlayer" }
  | { type: "pausePlayer" }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "pickMediaFile"; accept: readonly string[] }
  | { type: "pickDictionaryFile"; accept: readonly string[] }
  /** Measures the browser's support for a file's formats; answered by playbackEnvironmentMeasured. */
  | {
      type: "measurePlaybackEnvironment";
      mediaFileId: string;
      directMimeType: string | null;
      codecStrings: readonly string[];
    };
