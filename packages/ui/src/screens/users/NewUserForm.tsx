import {
  type AccountVia,
  actions,
  selectNewUserForm,
} from "@easyimmerse/state";
import type { AccountRole } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { SelectField } from "../../components/common/SelectField.tsx";
import { TextField } from "../../components/common/TextField.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { roleOptions } from "./roleOptions.ts";

/** The form through which an administrator creates an account on the server that `via` names, with an email address, a password and the access it starts with. */
export function NewUserForm({ via }: { via: AccountVia }) {
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
        dispatch(actions.newUserSubmitted(via));
      }}
    >
      <h2 className="text-sm font-semibold">New account</h2>
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
        label="Access"
        hint="Once the account is listed, its menu can also make it a library admin."
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
