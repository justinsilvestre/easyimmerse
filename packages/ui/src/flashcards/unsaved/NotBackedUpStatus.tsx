import { actions, selectIsWorkNotBackedUp } from "@easyimmerse/state";
import { Button } from "../../components/Button.tsx";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { useAppSelector } from "../../hooks/useAppSelector.ts";

/** A lasting line that tells, while the app runs without a server, that the flashcards waiting to be saved are kept only in this browser, with a way to log in. */
export function NotBackedUpStatus() {
  const isNotBackedUp = useAppSelector(selectIsWorkNotBackedUp);
  const dispatch = useAppDispatch();
  if (!isNotBackedUp) return null;
  return (
    <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-sm text-warning-fg shadow-md">
      <p className="flex-1">
        Your flashcards aren't backed up. They're stored only in this browser,
        so you'll lose them if its data is cleared.
      </p>
      <Button
        size="sm"
        onClick={() =>
          dispatch(actions.navigated({ type: "openAccountSettings" }))
        }
      >
        Log in or sign up
      </Button>
    </div>
  );
}
