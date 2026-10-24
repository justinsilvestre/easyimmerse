import { actions, selectNewUserForm } from "@easyimmerse/state";
import type { AccountRole } from "@easyimmerse/types";
import { Button } from "../../../components/common/Button.tsx";
import { SelectField } from "../../../components/common/SelectField.tsx";
import { TextField } from "../../../components/common/TextField.tsx";
import { useAppDispatch } from "../../../useAppDispatch.ts";
import { useAppSelector } from "../../../useAppSelector.ts";
import { roleOptions } from "./roleOptions.ts";

/** The form through which an administrator creates an account with an email address, a password and a role. */
export function NewUserForm() {
  const dispatch = useAppDispatch();
  const form = useAppSelector(selectNewUserForm);
  const change = (changes: Parameters<typeof actions.newUserFormChanged>[0]) =>
    dispatch(actions.newUserFormChanged(changes));
  return (
    <form
      noValidate
      aria-label="New account"
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch(actions.newUserSubmitted());
      }}
    >
      <h4 className="text-sm font-medium">New account</h4>
      <TextField
        label="Email"
        type="email"
        autoComplete="off"
        value={form.email}
        disabled={form.isCreating}
        onChange={(event) => change({ email: event.target.value })}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        value={form.password}
        disabled={form.isCreating}
        onChange={(event) => change({ password: event.target.value })}
      />
      <SelectField
        label="Role"
        options={roleOptions}
        value={form.role}
        disabled={form.isCreating}
        onChange={(event) =>
          change({ role: event.target.value as AccountRole })
        }
      />
      {form.failureMessage !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {form.failureMessage}
        </p>
      )}
      <Button
        type="submit"
        aria-disabled={!form.canSubmit}
        className="self-start"
      >
        {form.isCreating ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
