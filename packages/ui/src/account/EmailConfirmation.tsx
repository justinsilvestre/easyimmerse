import { useGetServerAuthInfoQuery } from "@easyimmerse/backend";
import {
  actions,
  selectConfirmationEmailMessage,
  selectHasSentConfirmationEmail,
  selectIsSendingConfirmationEmail,
} from "@easyimmerse/state";
import type { AccountUser } from "@easyimmerse/types";
import clsx from "clsx";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** Whether the account's email address is confirmed, with a button that mails a confirmation link while it is not. Shows nothing on a server that sends no email. */
export function EmailConfirmation({ user }: { user: AccountUser }) {
  const authInfo = useGetServerAuthInfoQuery();
  if (authInfo.data?.sends_email !== true) return null;
  if (user.email_confirmed_at_ms !== null)
    return <p className="text-xs text-success-fg">Confirmed</p>;
  return <NotConfirmed email={user.email} />;
}

function NotConfirmed({ email }: { email: string }) {
  const dispatch = useAppDispatch();
  const isSending = useAppSelector(selectIsSendingConfirmationEmail);
  const hasSent = useAppSelector(selectHasSentConfirmationEmail);
  const message = useAppSelector((state) =>
    selectConfirmationEmailMessage(state, email),
  );
  return (
    <div className="mt-1 flex flex-col items-start gap-1">
      <p className="text-xs text-fg-muted">Not confirmed yet.</p>
      <Button
        size="sm"
        aria-disabled={isSending}
        onClick={() => {
          if (!isSending) dispatch(actions.confirmationEmailRequested());
        }}
      >
        {sendButtonLabel(isSending, hasSent)}
      </Button>
      {message !== null && (
        <p
          role={message.tone === "danger" ? "alert" : "status"}
          className={clsx(
            "text-xs",
            message.tone === "danger" ? "text-danger-fg" : "text-success-fg",
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

function sendButtonLabel(isSending: boolean, hasSent: boolean): string {
  if (isSending) return "Sending…";
  return hasSent ? "Send it again" : "Send a confirmation link";
}
