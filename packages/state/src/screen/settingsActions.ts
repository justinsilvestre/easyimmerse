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
  conversionCacheClearRequested: () =>
    ({ type: "conversionCacheClearRequested" }) as const,
  /** The user chose how large the media cache may grow, or null to let it follow the disk's size. */
  conversionCacheBudgetChosen: (budgetBytes: number | null) =>
    ({ type: "conversionCacheBudgetChosen", budgetBytes }) as const,
};

/** An action of the Settings pages. */
export type SettingsAction = ReturnType<
  (typeof settingsActions)[keyof typeof settingsActions]
>;
