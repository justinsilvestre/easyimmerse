import type { PluginFormWizard } from "../screen/pluginForm/pluginFormWizard.ts";

/** A media-source plugin to import through, with the label of its import button. */
export type MediaImportSource = { name: string; label: string };

/**
 * The import dialog of a media-source plugin, open over the project overview, and the fetch its last form started.
 * Its `error` also holds why the fetch's status could not be followed.
 */
export type MediaImportWizard = PluginFormWizard & {
  source: MediaImportSource;
  /** The fetch the last action started, watched under the operations' jobs. */
  jobId: string | null;
};

/** Each project's import dialog, by the project's id, while it is open over the overview or its fetch outlasts the overview. */
export type MediaImports = Partial<Record<string, MediaImportWizard>>;

/** Returns the imports with the project's dialog set to `wizard`, or removed when it is null, keeping the same object when nothing changes. */
export function withWizard(
  imports: MediaImports,
  projectId: string,
  wizard: MediaImportWizard | null,
): MediaImports {
  if ((imports[projectId] ?? null) === wizard) return imports;
  if (wizard !== null) return { ...imports, [projectId]: wizard };
  const { [projectId]: _dropped, ...rest } = imports;
  return rest;
}

/** Tells whether a dialog outlasts its project's overview: one whose fetch has started, or whose action may be starting one. */
export function outlastsTheOverview(wizard: MediaImportWizard): boolean {
  return wizard.jobId !== null || wizard.isAwaitingAnswer;
}
