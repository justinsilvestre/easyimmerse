import {
  actions,
  selectMailedLink,
  selectNewPasswordStrength,
} from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter.tsx";
import { TextField } from "../components/TextField.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { MailedLinkServerField } from "./MailedLinkServerField.tsx";

/** The form through which a person chooses a new password with the reset link the app was opened with, which then logs them in. */
export function NewPasswordForm() {
  const dispatch = useAppDispatch();
  const link = useAppSelector(selectMailedLink);
  const strength = useAppSelector(selectNewPasswordStrength);
  if (link === null) return null;
  const isBusy = link.status === "sending" || link.status === "done";
  return (
    <form
      noValidate
      aria-label="Choose a new password"
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(actions.mailedLinkSubmitted());
      }}
    >
      <h3 className="text-sm font-semibold">Choose a new password</h3>
      <p className="text-sm text-fg-muted">
        Choosing a new password logs you out on every other device.
      </p>
      <MailedLinkServerField link={link} />
      <div className="flex flex-col gap-1.5">
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint={strength === null ? "At least 8 characters." : undefined}
          value={link.password}
          disabled={isBusy}
          onChange={(event) =>
            dispatch(
              actions.mailedLinkFormChanged({ password: event.target.value }),
            )
          }
        />
        {strength !== null && <PasswordStrengthMeter strength={strength} />}
      </div>
      {link.failureMessage !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {link.failureMessage}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        aria-disabled={!link.canSubmit}
        className="self-start"
      >
        {link.status === "sending"
          ? "Saving…"
          : link.status === "done"
            ? "Logging in…"
            : "Set the new password"}
      </Button>
    </form>
  );
}
