/** The action creators of the app's own life. */
export const startupActions = {
  /** The store has been created; `createAppStore` dispatches it once. */
  appStarted: () => ({ type: "appStarted" }) as const,
};

/** An action of the app's own life. */
export type StartupAction = ReturnType<
  (typeof startupActions)[keyof typeof startupActions]
>;
