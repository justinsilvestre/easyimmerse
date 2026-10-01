import { useCreateProjectMutation } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { HelpLink } from "../components/HelpLink.tsx";
import { ProjectSettingsForm } from "../components/ProjectSettingsForm.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { describeBackendError } from "../describeBackendError.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useNewProjectSettings } from "../hooks/useNewProjectSettings.ts";

/** Collects the settings of a new project, creates it, and opens it. */
export function NewProjectScreen() {
  const dispatch = useAppDispatch();
  const initialSettings = useNewProjectSettings();
  const [createProject, { error }] = useCreateProjectMutation();
  return (
    <ScreenLayout wide headerActions={<HelpLink />}>
      <h1 className="text-2xl font-semibold">New project</h1>
      {error && (
        <p role="alert" className="text-sm text-danger-fg">
          Could not create the project: {describeBackendError(error)}
        </p>
      )}
      {initialSettings === null ? (
        <p role="status" className="text-sm text-fg-muted">
          Loading…
        </p>
      ) : (
        <ProjectSettingsForm
          initialSettings={initialSettings}
          submitLabel="Create project"
          onSubmit={async (settings) => {
            const result = await createProject(settings);
            if (result.data) dispatch(actions.projectOpened(result.data.id));
          }}
          onCancel={() => dispatch(actions.homeOpened())}
        />
      )}
    </ScreenLayout>
  );
}
