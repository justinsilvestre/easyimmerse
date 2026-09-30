import { actions, selectPendingFilePick } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { Button } from "./Button.tsx";

export function PickFileButton() {
  const dispatch = useAppDispatch();
  const pending = useAppSelector(selectPendingFilePick);
  return (
    <Button
      disabled={pending}
      onClick={() => dispatch(actions.filePickRequested())}
    >
      Pick a subtitle file
    </Button>
  );
}
