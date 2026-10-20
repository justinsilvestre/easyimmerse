import type {
  ServerOffer,
  SignInFormView,
  SignInMode,
  SignInServerChoice,
} from "@easyimmerse/state";
import {
  actions,
  selectAccountServerOptions,
  selectCanSubmitSignIn,
  selectSignInForm,
} from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { ChoiceRow } from "../components/ChoiceRow.tsx";
import { SegmentedControl } from "../components/SegmentedControl.tsx";
import { TextField } from "../components/TextField.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

const modeOptions = [
  { value: "login", label: "Log in" },
  { value: "signup", label: "Sign up" },
] satisfies { value: SignInMode; label: string }[];

const serverOptions = [
  { value: "official", label: "easyImmerse" },
  { value: "own", label: "Your own server" },
] satisfies { value: SignInServerChoice; label: string }[];

/** The form that logs in to an easyImmerse server, or signs up on it, and connects the app to it. */
export function SignInForm() {
  const dispatch = useAppDispatch();
  const form = useAppSelector(selectSignInForm);
  const servers = useAppSelector(selectAccountServerOptions);
  const canSubmit = useAppSelector(selectCanSubmitSignIn);
  const isBusy =
    form.status === "checkingServer" || form.status === "submitting";
  const change = (changes: Parameters<typeof actions.signInFormChanged>[0]) =>
    dispatch(actions.signInFormChanged(changes));
  return (
    <form
      noValidate
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(actions.signInSubmitted());
      }}
    >
      <p className="text-sm text-fg-muted">
        This app is not connected to a server. Log in to an easyImmerse server
        to keep your projects, media and flashcards there.
      </p>
      <SegmentedControl
        label="Log in or sign up"
        options={modeOptions}
        value={form.mode}
        onChange={(mode) => change({ mode })}
      />
      {servers.hasOfficialServer && (
        <ChoiceRow
          label="Server"
          options={serverOptions}
          value={servers.serverChoice}
          onChange={(serverChoice) => change({ serverChoice })}
        />
      )}
      {servers.serverChoice === "own" && (
        <TextField
          label="Server address"
          type="url"
          placeholder="https://"
          hint="The address your easyImmerse server is reached at, starting with http:// or https://."
          value={form.ownServerUrl}
          disabled={isBusy}
          onChange={(event) => change({ ownServerUrl: event.target.value })}
        />
      )}
      <ServerOfferNotice offer={form.serverOffer} mode={form.mode} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={form.email}
        disabled={isBusy}
        onChange={(event) => change({ email: event.target.value })}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete={
          form.mode === "login" ? "current-password" : "new-password"
        }
        hint={form.mode === "signup" ? "At least 8 characters." : undefined}
        value={form.password}
        disabled={isBusy}
        onChange={(event) => change({ password: event.target.value })}
      />
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
