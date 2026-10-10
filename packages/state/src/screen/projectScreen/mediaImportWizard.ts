import type { PluginForm } from "@easyimmerse/types";

/** A media-source plugin to import through, with the label of its import button. */
export type MediaImportSource = { name: string; label: string };

/** The import dialog of a media-source plugin, open over the project overview, and the fetch its last form started. */
export type MediaImportWizard = {
  source: MediaImportSource;
  /** The form the plugin last asked for, or null while it is being asked for. */
  form: PluginForm | null;
  /** True while the plugin answers an action. */
  isAwaitingAnswer: boolean;
  /** The fetch the last action started, watched under the operations' jobs. */
  jobId: string | null;
  /** Why the form could not be shown, the action failed, or the fetch could not be followed. */
  error: string | null;
};
