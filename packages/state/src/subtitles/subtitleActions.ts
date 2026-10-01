export const subtitleActions = {
  subtitleOverlayToggled: () => ({ type: "subtitleOverlayToggled" }) as const,
  subtitlesPanelToggled: () => ({ type: "subtitlesPanelToggled" }) as const,
  subtitleTextLoaded: (trackId: string, text: string) =>
    ({ type: "subtitleTextLoaded", trackId, text }) as const,
  subtitleTextFailed: (trackId: string, message: string) =>
    ({ type: "subtitleTextFailed", trackId, message }) as const,
};
