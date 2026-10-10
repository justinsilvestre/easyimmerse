import type { LookupState } from "@easyimmerse/state";
import type { LookupResult } from "@easyimmerse/types";
import type { ComponentProps } from "react";
import type { AnchoredPopup } from "./AnchoredPopup.tsx";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import type { LookupDisplayState } from "./lookupDisplayState.ts";

/** What the pop-up shows, as `useLookupDisplay` reads it. */
type Display = {
  state: LookupDisplayState | null;
  resolveMediaUrl: ComponentProps<typeof DictionaryPopup>["resolveMediaUrl"];
};

/** The pop-up's handlers, each dispatching to the lookup. */
type LookupPopupHandlers = Pick<
  ComponentProps<typeof DictionaryPopup>,
  "onSearch" | "wordActions" | "onCreateFlashcard" | "onClose"
> & {
  onToggleSize: () => void;
  onPointerInsideChange: (isInside: boolean) => void;
};

/** The props of the pop-up and of the wrapper that places it, or null while it is closed. */
export function lookupPopupProps(
  lookup: LookupState | null,
  popupId: string,
  display: Display,
  { onToggleSize, onPointerInsideChange, ...handlers }: LookupPopupHandlers,
) {
  const popup = lookup?.popup ?? null;
  if (lookup === null || popup === null) return null;
  const pending = lookup.pendingFlashcard;
  return {
    anchored: {
      anchor: popup.mode === "word" ? (popup.chosen?.anchor ?? null) : null,
      size: lookup.size,
      onPointerInsideChange,
    } satisfies Omit<ComponentProps<typeof AnchoredPopup>, "children">,
    props: {
      id: popupId,
      state: display.state,
      mode: popup.mode,
      size: lookup.size,
      onToggleSize,
      resolveMediaUrl: display.resolveMediaUrl,
      pendingFlashcard:
        pending?.stage === "waiting" ? pending.chosen.word.term : null,
      ...handlers,
    } satisfies Omit<
      ComponentProps<typeof DictionaryPopup>,
      "onSetUpDictionary"
    >,
  };
}

/** The length of text the pop-up's lookup matched: undefined while it is being looked up, and null when nothing matched. */
export function matchedLengthOf(
  state: LookupDisplayState | null,
  results: readonly LookupResult[],
): number | null | undefined {
  return state?.kind === "loading"
    ? undefined
    : (results[0]?.matchedText.length ?? null);
}
