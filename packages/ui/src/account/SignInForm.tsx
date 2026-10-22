import type {
  ServerOffer,
  SignInFormView,
  SignInMode,
} from "@easyimmerse/state";
import {
  actions,
  selectAccountServerOptions,
  selectCanSubmitSignIn,
  selectPasswordStrength,
  selectSignInForm,
} from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { LinkButton } from "../components/LinkButton.tsx";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter.tsx";
import { TextField } from "../components/TextField.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { PasswordResetForm } from "./PasswordResetForm.tsx";

/**
 * The form that logs in to an easyImmerse server, or signs up on it, and connects the app to it. `intro` tells what logging in does.
 * It logs in unless the person follows its link to create an account, and uses the easyImmerse cloud, where the app knows of one,
 * unless the person chooses their own server.
 */
export function SignInForm({ intro }: { intro?: string }) {
  const dispatch = useAppDispatch();
  const form = useAppSelector(selectSignInForm);
  const servers = useAppSelector(selectAccountServerOptions);
  const canSubmit = useAppSelector(selectCanSubmitSignIn);
  const passwordStrength = useAppSelector(selectPasswordStrength);
  const change = (changes: Parameters<typeof actions.signInFormChanged>[0]) =>
    dispatch(actions.signInFormChanged(changes));
  if (form.passwordReset !== null) return <PasswordResetForm />;
  return (
    <form
      noValidate
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(actions.signInSubmitted());
      }}
    >
      {intro !== undefined && <p className="text-sm text-fg-muted">{intro}</p>}
      <h3 className="text-sm font-semibold">
        {form.mode === "login" ? "Log in" : "Create an account"}
      </h3>
      {servers.serverChoice === "official" ? (
        <OfficialServer
          isBusy={form.isBusy}
          onChooseOwn={() => change({ serverChoice: "own" })}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <TextField
            label="Server address"
            type="url"
            placeholder="https://"
            hint="The address your easyImmerse server is reached at, starting with http:// or https://."
            value={form.ownServerUrl}
            disabled={form.isBusy}
            onChange={(event) => change({ ownServerUrl: event.target.value })}
          />
          {servers.hasOfficialServer && (
            <LinkButton
              aria-disabled={form.isBusy}
              className="self-start text-sm"
              onClick={() => {
                if (!form.isBusy) change({ serverChoice: "official" });
              }}
            >
              Use the easyImmerse cloud
            </LinkButton>
          )}
        </div>
      )}
      <ServerOfferNotice offer={form.serverOffer} mode={form.mode} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={form.email}
        disabled={form.isBusy}
        onChange={(event) => change({ email: event.target.value })}
      />
      <div className="flex flex-col gap-1.5">
        <TextField
          label="Password"
          type="password"
          autoComplete={
            form.mode === "login" ? "current-password" : "new-password"
          }
          hint={
            form.mode === "signup" && passwordStrength === null
              ? "At least 8 characters."
              : undefined
          }
          value={form.password}
          disabled={form.isBusy}
          onChange={(event) => change({ password: event.target.value })}
        />
        {passwordStrength !== null && (
          <PasswordStrengthMeter strength={passwordStrength} />
        )}
        {form.mode === "login" && <ForgotPassword form={form} />}
      </div>
      {form.status === "passwordResetUnavailable" && (
        <p role="status" className="text-sm text-warning-fg">
          This server can't send email. Ask its administrator to set a new
          password for you.
        </p>
      )}
      {form.failureMessage !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {form.failureMessage}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        aria-disabled={!canSubmit}
        className="self-start"
      >
        {submitLabel(form)}
      </Button>
      <ModeSwitch
        mode={form.mode}
        isBusy={form.isBusy}
        onChange={(mode) => change({ mode })}
      />
    </form>
  );
}

/** Names the easyImmerse cloud as the server the form uses, with the link that chooses the person's own server instead. */
function OfficialServer({
  isBusy,
  onChooseOwn,
}: {
  isBusy: boolean;
  onChooseOwn: () => void;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="text-fg-muted">Server: easyImmerse cloud</span>
      <LinkButton
        aria-disabled={isBusy}
        onClick={() => {
          if (!isBusy) onChooseOwn();
        }}
      >
        Use your own server
      </LinkButton>
    </p>
  );
}

/** The line under the form that turns logging in into creating an account, or back. */
function ModeSwitch({
  mode,
  isBusy,
  onChange,
}: {
  mode: SignInMode;
  isBusy: boolean;
  onChange: (mode: SignInMode) => void;
}) {
  const other = mode === "login" ? "signup" : "login";
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-fg-muted">
      {mode === "login" ? "Don't have an account?" : "Already have an account?"}
      <LinkButton
        aria-disabled={isBusy}
        onClick={() => {
          if (!isBusy) onChange(other);
        }}
      >
        {mode === "login" ? "Create an account" : "Log in"}
      </LinkButton>
    </p>
  );
}

/** The button that asks for a password reset link, which first checks that the server can send one. */
function ForgotPassword({ form }: { form: SignInFormView }) {
  const dispatch = useAppDispatch();
  return (
    <LinkButton
      aria-disabled={!form.canAskPasswordReset}
      className="self-start text-sm"
      onClick={() => {
        if (form.canAskPasswordReset) dispatch(actions.passwordResetAsked());
      }}
    >
      {form.status === "checkingPasswordReset"
        ? "Checking the server…"
        : "Forgot your password?"}
    </LinkButton>
  );
}

/** Tells when the chosen server does not offer what the form is set to do. */
function ServerOfferNotice({
  offer,
  mode,
}: {
  offer: ServerOffer;
  mode: SignInMode;
}) {
  const message =
    offer === "noAccounts"
      ? "This server has no accounts, so there is nothing to log in to."
      : offer === "signupClosed" && mode === "signup"
        ? "This server does not let anyone create an account. Ask its administrator for one, then log in."
        : null;
  if (message === null) return null;
  return (
    <p role="status" className="text-sm text-warning-fg">
      {message}
    </p>
  );
}

function submitLabel(form: SignInFormView): string {
  if (form.status === "checkingServer") return "Checking the server…";
  if (form.status === "submitting")
    return form.mode === "login" ? "Logging in…" : "Creating the account…";
  return form.mode === "login" ? "Log in" : "Create account";
}
