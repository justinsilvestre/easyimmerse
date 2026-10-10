import type { PluginFormWizard } from "../pluginForm/pluginFormWizard.ts";

/** A media-source plugin to import through, with the label of its import button. */
export type MediaImportSource = { name: string; label: string };

/** The import dialog of a media-source plugin, open over the project overview, and the fetch its last form started. */
export type MediaImportWizard = PluginFormWizard & {
  source: MediaImportSource;
  /** The fetch the last action started, watched under the operations' jobs. */
  jobId: string | null;
};
