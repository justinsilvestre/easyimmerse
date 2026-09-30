import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { Button } from "./Button.tsx";

const helpUrl = "https://github.com/justinsilvestre/easyimmerse";

export function HelpLink() {
  const dispatch = useAppDispatch();
  return (
    <Button
      variant="subtle"
      onClick={() => dispatch(actions.externalLinkRequested(helpUrl))}
    >
      Help
    </Button>
  );
}
