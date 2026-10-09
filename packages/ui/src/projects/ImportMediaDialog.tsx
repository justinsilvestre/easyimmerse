import type { FormInput, MediaSourceJob, PluginForm } from "@easyimmerse/types";
import { PluginFormDialog } from "../plugins/PluginFormDialog.tsx";
import { FetchProgress } from "./FetchProgress.tsx";

/**
 * Shows the import interface of a media-source plugin: the forms it asks for, one after another,
 * and then the fetch the last one started. Fetching lasts a while, so the dialog stays open
 * with the form locked, showing the fetch's progress and what the plugin reports,
 * until the caller reports the outcome. A failed fetch leaves its log open to read.
 */
export function ImportMediaDialog({
  label,
  form,
  isBusy,
  job,
  error,
  onAction,
  onClose,
}: {
  /** The plugin's import button label, which names the dialog until the plugin's form arrives. */
  label: string;
  /** The form the plugin asked for, or null while it is being asked for. */
  form: PluginForm | null;
  /** Whether the plugin is answering an action. */
  isBusy: boolean;
  /** The fetch being watched, or null before one starts. */
  job: MediaSourceJob | null;
  /** Why the form could not be shown or the fetch started, or null. */
  error: string | null;
  onAction: (actionId: string, input: FormInput[]) => void;
  onClose: () => void;
}) {
  const isRunning = job?.status === "running";
  const failure =
    error ??
    (job?.status === "failed"
      ? (job.error?.message ?? "The media could not be added.")
      : null);
  return (
    <PluginFormDialog
      form={form}
      fallbackTitle={label}
      loadingMessage="Asking the plugin what it needs…"
      error={failure}
      isBusy={isBusy || isRunning}
      onAction={onAction}
      onClose={onClose}
      closeLabel={isRunning ? "Close" : "Cancel"}
    >
      {job && <FetchProgress job={job} />}
    </PluginFormDialog>
  );
}
