import { useGetServerAuthInfoQuery } from "@easyimmerse/backend";
import {
  actions,
  selectConfirmationEmailMessage,
  selectIsSendingConfirmationEmail,
} from "@easyimmerse/state";
import type { AccountUser } from "@easyimmerse/types";
import clsx from "clsx";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** Whether the account's email address is confirmed, with a button that mails another link while it is not. Shows nothing on a server that sends no email. */
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
  const message = useAppSelector(selectConfirmationEmailMessage);
  return (
    <div className="mt-1 flex flex-col items-start gap-1">
      <p className="text-xs text-fg-muted">
        Not confirmed yet. We sent a link to {email}.
      </p>
      <Button
        size="sm"
        aria-disabled={isSending}
        onClick={() => {
          if (!isSending) dispatch(actions.confirmationEmailRequested());
        }}
      >
        {isSending ? "Sending…" : "Send the link again"}
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
