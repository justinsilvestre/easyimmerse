import { actions, selectHasDismissedSuggestions } from "@easyimmerse/state";
import { useId } from "react";
import { Button } from "../../components/common/Button.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";

/** The Suggestions section of Settings, which shows again the suggestions the person dismissed on this device. */
export function SuggestionsSection() {
  const headingId = useId();
  const dispatch = useAppDispatch();
  const hasDismissed = useAppSelector(selectHasDismissedSuggestions);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-base font-semibold">
        Suggestions
      </h3>
      <p className="text-sm text-fg-muted">
        The app suggests other parts of easyImmerse where they would help, such
        as ways to back up your work.
      </p>
      <Button
        className="self-start"
        disabled={!hasDismissed}
        onClick={() => dispatch(actions.dismissedSuggestionsRestored())}
      >
        Show dismissed suggestions again
      </Button>
    </section>
  );
}
