import { useUpdateProjectSettingsMutation } from "@easyimmerse/backend";
import type { Project } from "@easyimmerse/types";
import { HelpLink } from "../components/HelpLink.tsx";
import { ProjectSettingsForm } from "../components/ProjectSettingsForm.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { describeBackendError } from "../describeBackendError.ts";

/** Edits a project's settings and returns to the project once they are saved or the edit is cancelled. */
export function ProjectScreenSettings({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const [updateProjectSettings, { error }] = useUpdateProjectSettingsMutation();
  return (
    <ScreenLayout wide headerActions={<HelpLink />}>
      <h1 className="text-2xl font-semibold">Project settings</h1>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          Could not save the settings: {describeBackendError(error)}
        </p>
      )}
      <ProjectSettingsForm
        initialSettings={project.settings}
        submitLabel="Save changes"
        onSubmit={async (settings) => {
          const result = await updateProjectSettings({
            projectId: project.id,
            settings,
          });
          if (result.data) onClose();
        }}
        onCancel={onClose}
      />
    </ScreenLayout>
  );
}
