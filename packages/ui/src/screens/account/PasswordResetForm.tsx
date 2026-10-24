import { actions, selectSignInForm } from "@easyimmerse/state";
import { Button } from "../../components/common/Button.tsx";
import { TextField } from "../../components/common/TextField.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";

/** The form that asks the chosen server to mail a link for choosing a new password, which the sign-in form turns into. */
export function PasswordResetForm() {
  const dispatch = useAppDispatch();
  const form = useAppSelector(selectSignInForm);
  const isSending = form.passwordReset === "sending";
  return (
    <form
      noValidate
      aria-label="Reset password"
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(actions.passwordResetSubmitted());
      }}
    >
      <h3 className="text-sm font-semibold">Reset password</h3>
      <p className="text-sm text-fg-muted">
        Enter the email address of your account. The server will send a link to
        it, which lets you choose a new password.
      </p>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={form.email}
        disabled={isSending}
        onChange={(event) =>
          dispatch(actions.signInFormChanged({ email: event.target.value }))
        }
      />
      {form.passwordReset === "sent" && (
        <p role="status" className="text-sm text-success-fg">
          If that address has an account, a link is on its way. It works for one
          hour.
        </p>
      )}
      {form.failureMessage !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {form.failureMessage}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="primary"
          aria-disabled={!form.canSubmitPasswordReset}
        >
          {isSending ? "Sending…" : "Send a reset link"}
        </Button>
        <Button
          aria-disabled={isSending}
          onClick={() => {
            if (!isSending) dispatch(actions.passwordResetLeft());
          }}
        >
          Back to logging in
        </Button>
      </div>
    </form>
  );
}
