import type {
  DesktopServerSettingsFields,
  DesktopServerSettingsFormView,
} from "@easyimmerse/state";
import { Button } from "../../components/common/Button.tsx";
import { CheckboxField } from "../../components/common/CheckboxField.tsx";
import { ChoiceRow } from "../../components/common/ChoiceRow.tsx";
import { TextField } from "../../components/common/TextField.tsx";

type LoadedForm = Extract<DesktopServerSettingsFormView, { status: "loaded" }>;

/** The server's settings: the computer's name for paired devices, where it listens, how clients authenticate, what it serves, whether it starts with the app, and its extra host names. */
export function ServerSettingsForm({
  form,
  onChange,
  onSave,
}: {
  form: DesktopServerSettingsFormView;
  onChange: (changes: Partial<DesktopServerSettingsFields>) => void;
  onSave: () => void;
}) {
  switch (form.status) {
    case "loading":
      return <p className="text-sm text-fg-muted">Reading the settings…</p>;
    case "failed":
      return (
        <p role="alert" className="text-sm text-danger-fg">
          The server settings could not be read: {form.message}
        </p>
      );
    case "loaded":
      return <LoadedSettings form={form} onChange={onChange} onSave={onSave} />;
  }
}

function LoadedSettings({
  form,
  onChange,
  onSave,
}: {
  form: LoadedForm;
  onChange: (changes: Partial<DesktopServerSettingsFields>) => void;
  onSave: () => void;
}) {
  const { fields } = form;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.canSave) onSave();
      }}
    >
      <TextField
        label="Device name"
        className="max-w-xs"
        value={fields.device_name}
        hint="Paired phones and other devices show this computer by this name."
        onChange={(event) => onChange({ device_name: event.target.value })}
      />
      <div className="flex flex-col gap-1">
        <TextField
          label="Address and port"
          className="max-w-xs"
          value={fields.bind}
          hint="0.0.0.0 listens on every network this computer is on; 127.0.0.1 lets only this computer in."
          onChange={(event) => onChange({ bind: event.target.value })}
        />
        {form.bindProblem !== null && (
          <p className="text-xs text-danger-fg">{form.bindProblem}</p>
        )}
      </div>
      <ChoiceRow
        label="Authentication"
        value={fields.auth}
        options={[
          { value: "launch_token", label: "Launch token only" },
          { value: "accounts", label: "Accounts" },
        ]}
        onChange={(auth) => onChange({ auth })}
      />
      <p className="-mt-2 text-xs text-fg-muted">
        {fields.auth === "accounts"
          ? "People log in with an email address and a password."
          : "Devices pair through Local network sync and get full access, with no account."}
      </p>
      {fields.auth === "accounts" && (
        <CheckboxField
          label="Let anyone who can reach the server sign up"
          hint="New accounts are library users. Otherwise only an administrator adds accounts."
          checked={fields.open_signup}
          onChange={(event) => onChange({ open_signup: event.target.checked })}
        />
      )}
      <ChoiceRow
        label="What the server serves"
        value={fields.api_only ? "api" : "app"}
        options={[
          { value: "app", label: "Serve the complete web app" },
          { value: "api", label: "Serve only the API" },
        ]}
        onChange={(served) => onChange({ api_only: served === "api" })}
      />
      <CheckboxField
        label="Start the server when the app starts"
        checked={fields.autostart}
        onChange={(event) => onChange({ autostart: event.target.checked })}
      />
      <details className="text-sm">
        <summary className="cursor-pointer text-fg-muted">Advanced</summary>
        <TextField
          label="Extra expected hosts"
          className="mt-2"
          value={fields.expected_hosts}
          placeholder="books.example.org"
          hint="Host names, separated by commas, that other devices use to reach this server besides its own addresses, such as a name a reverse proxy forwards."
          onChange={(event) => onChange({ expected_hosts: event.target.value })}
        />
      </details>
      <SaveRow form={form} />
    </form>
  );
}

function SaveRow({ form }: { form: LoadedForm }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" aria-disabled={!form.canSave}>
          {form.isSaving ? "Saving…" : "Save"}
        </Button>
        {form.restartsServer && (
          <p className="text-sm text-fg-muted">Saving restarts the server.</p>
        )}
      </div>
      {form.saveFailure !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          The settings could not be saved: {form.saveFailure}
        </p>
      )}
    </div>
  );
}
