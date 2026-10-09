import type { FormInput, PluginForm } from "@easyimmerse/types";
import { PluginFormDialog } from "../plugins/PluginFormDialog.tsx";

/**
 * Shows the media interface of the plugin a media file was imported through:
 * the forms it asks for, one after another, where the user fetches further subtitle tracks
 * from the source and removes ones the file holds.
 */
export function SourceMediaDialog({
  title,
  form,
  isBusy,
  error,
  onAction,
  onClose,
}: {
  /** The plugin's title, which names the dialog until the plugin's form arrives. */
  title: string;
  /** The form the plugin asked for, or null while it is being asked for. */
  form: PluginForm | null;
  /** Whether the plugin is answering an action. */
  isBusy: boolean;
  /** Why the form could not be shown or the action carried out, or null. */
  error: string | null;
  onAction: (actionId: string, input: FormInput[]) => void;
  onClose: () => void;
}) {
  return (
    <PluginFormDialog
      form={form}
      fallbackTitle={title}
      isBusy={isBusy}
      onAction={onAction}
      onClose={onClose}
    >
      {form === null && error === null && (
        <p className="text-sm text-fg-muted" role="status">
          Asking the plugin what it offers…
        </p>
      )}
      {isBusy && (
        <p className="text-sm text-fg-muted" role="status">
          Working… This can take a moment.
        </p>
      )}
      {error !== null && (
        <p className="text-sm text-danger-fg" role="alert">
          {error}
        </p>
      )}
    </PluginFormDialog>
  );
}
