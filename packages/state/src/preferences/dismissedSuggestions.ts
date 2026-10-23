import type { AppRoot } from "../app/createAppStore.ts";

/** The suggestions of other easyImmerse components that the person can dismiss one by one. */
export const suggestionIds = ["backup"] as const;

/** A suggestion the person can dismiss: "backup" is the home screen's card about backing up work kept only on this device. */
export type SuggestionId = (typeof suggestionIds)[number];

/** Reads the stored list of dismissed suggestions, leaving out anything that is not a known suggestion's id. */
export function parseDismissedSuggestions(
  value: string | undefined,
): SuggestionId[] {
  const stored = parseArray(value);
  return suggestionIds.filter((id) => stored.includes(id));
}

/** Returns the stored list of dismissed suggestions with `id` added. */
export function withSuggestionDismissed(
  value: string | undefined,
  id: SuggestionId,
): string {
  const dismissed = parseDismissedSuggestions(value);
  return JSON.stringify(
    dismissed.includes(id) ? dismissed : [...dismissed, id],
  );
}

/** Tells whether the person dismissed the suggestion. */
export const selectIsSuggestionDismissed =
  (id: SuggestionId) => (state: AppRoot) =>
    dismissedOf(state).includes(id);

/** Tells whether the person dismissed any suggestion, which Settings can show again. */
export const selectHasDismissedSuggestions = (state: AppRoot) =>
  dismissedOf(state).length > 0;

function dismissedOf(state: AppRoot): SuggestionId[] {
  return parseDismissedSuggestions(
    state.app.preferences.values.dismissedSuggestions,
  );
}

function parseArray(value: string | undefined): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
