import type { RootState } from "../app/createAppStore.ts";

/** Returns the selector for the job with the given key, while it is watched. */
export const selectJob = (key: string) => (state: RootState) =>
  state.app.operations.jobs[key];
