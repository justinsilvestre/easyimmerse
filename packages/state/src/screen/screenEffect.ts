/** The side effects that the screens ask for: the player's requests and the platform's file pickers. */
export type ScreenEffect =
  | { type: "seekPlayer"; seconds: number }
  | { type: "togglePlayer" }
  | { type: "playPlayer" }
  | { type: "pausePlayer" }
  | { type: "pickFile"; accept: readonly string[] }
  | { type: "pickMediaFile"; accept: readonly string[] }
  | { type: "pickDictionaryFile"; accept: readonly string[] };
