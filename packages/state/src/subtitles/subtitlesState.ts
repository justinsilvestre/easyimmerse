export type SubtitlesState = {
  /** Which track shows on top of the video. */
  overlay: "target" | "translation";
  panelOpen: boolean;
  /** Text of subtitle files the browser holds, by track id, for tracks whose source is a browser_file. The server cannot read those. */
  browserFileTexts: Record<string, string>;
};

export const initialSubtitlesState: SubtitlesState = {
  overlay: "target",
  panelOpen: true,
  browserFileTexts: {},
};
