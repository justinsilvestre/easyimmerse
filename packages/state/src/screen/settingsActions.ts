/** The action creators of the Settings pages: the removal of a dictionary, and the media cache's controls. */
export const settingsActions = {
  /** The user pressed Remove on a dictionary, which asks before removing it. */
  dictionaryRemovalRequested: (dictionaryId: string) =>
    ({ type: "dictionaryRemovalRequested", dictionaryId }) as const,
  /** The user confirmed that the dictionary is to be removed. */
  dictionaryRemovalConfirmed: (dictionaryId: string) =>
    ({ type: "dictionaryRemovalConfirmed", dictionaryId }) as const,
  dictionaryRemovalCancelled: () =>
    ({ type: "dictionaryRemovalCancelled" }) as const,
};

/** An action of the Settings pages. */
export type SettingsAction = ReturnType<
  (typeof settingsActions)[keyof typeof settingsActions]
>;
