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
import { ChevronDown, ChevronRight } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Button } from "../components/Button.tsx";
import { LinkButton } from "../components/LinkButton.tsx";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter.tsx";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { TextField } from "../components/TextField.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { PasswordResetForm } from "./PasswordResetForm.tsx";

const modeOptions = [
  { value: "login", label: "Log in" },
  { value: "signup", label: "Sign up" },
] satisfies { value: SignInMode; label: string }[];

/**
 * The form that logs in to an easyImmerse server, or signs up on it, and connects the app to it. `intro` tells what logging in does.
 * It uses the easyImmerse cloud, where the app knows of one, unless the person opens More options to give their own server's address.
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
      <SegmentedControl
        label="Log in or sign up"
        options={modeOptions}
        value={form.mode}
        onChange={(mode) => change({ mode })}
      />
      {!servers.hasOfficialServer && (
        <ServerAddressField
          value={form.ownServerUrl}
          isBusy={form.isBusy}
          onChange={(ownServerUrl) => change({ ownServerUrl })}
        />
      )}
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
      {servers.hasOfficialServer && (
        <MoreOptions
          isOpen={servers.serverChoice === "own"}
          isBusy={form.isBusy}
          onToggle={(isOpen) =>
            change({ serverChoice: isOpen ? "own" : "official" })
          }
        >
          <ServerAddressField
            value={form.ownServerUrl}
            isBusy={form.isBusy}
            onChange={(ownServerUrl) => change({ ownServerUrl })}
          />
        </MoreOptions>
      )}
      <ServerOfferNotice offer={form.serverOffer} mode={form.mode} />
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
    </form>
  );
}

/** Options most people never need, behind a toggle that shows them: for now, the address of the person's own server. */
function MoreOptions({
  isOpen,
  isBusy,
  onToggle,
  children,
}: {
  isOpen: boolean;
  isBusy: boolean;
  onToggle: (isOpen: boolean) => void;
  children: ReactNode;
}) {
  const contentId = useId();
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-disabled={isBusy}
        className="-ml-1 flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        onClick={() => {
          if (!isBusy) onToggle(!isOpen);
        }}
      >
        <Chevron aria-hidden className="size-4" />
        More options
      </button>
      {isOpen && (
        <div id={contentId} className="border-l-2 border-line pl-3">
          {children}
        </div>
      )}
    </div>
  );
}

function ServerAddressField({
  value,
  isBusy,
  onChange,
}: {
  value: string;
  isBusy: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      label="Server address"
      type="url"
      placeholder="https://"
      hint="The address of your own easyImmerse server, starting with http:// or https://."
      value={value}
      disabled={isBusy}
      onChange={(event) => onChange(event.target.value)}
    />
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
        ? "This server does not let anyone sign up. Ask its administrator for an account, then log in."
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
    return form.mode === "login" ? "Logging in…" : "Signing up…";
  return form.mode === "login" ? "Log in" : "Sign up";
}
