import { actions, type MailedLinkView } from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { MailedLinkServerField } from "./MailedLinkServerField.tsx";

/** What came of the confirmation link the app was opened with, and the server's address when the app knows of no server. */
export function EmailConfirmationByLink({ link }: { link: MailedLinkView }) {
  const dispatch = useAppDispatch();
  if (link.status === "done")
    return (
      <p role="status" className="text-sm text-success-fg">
        Your email address is confirmed.
      </p>
    );
  if (link.status === "sending" && !link.needsServerAddress)
    return (
      <p className="text-sm text-fg-muted">Confirming your email address…</p>
    );
  return (
    <form
      noValidate
      aria-label="Confirm your email address"
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(actions.mailedLinkSubmitted());
      }}
    >
      {link.failureMessage !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {link.failureMessage}
        </p>
      )}
      <MailedLinkServerField link={link} />
      {link.needsServerAddress && (
        <Button
          type="submit"
          variant="primary"
          aria-disabled={!link.canSubmit}
          className="self-start"
        >
          {link.status === "sending"
            ? "Confirming…"
            : "Confirm my email address"}
        </Button>
      )}
    </form>
  );
}
