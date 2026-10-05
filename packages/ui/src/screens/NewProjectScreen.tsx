import {
  useCreateProjectMutation,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { ProjectSettings } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { newProjectSettings } from "../projects/newProjectSettings.ts";
import { ProjectSettingsView } from "../projects/ProjectSettingsView.tsx";

/** The new project form, filled in from the last created project, which opens the project once it is created. */
export function NewProjectScreen({
  onCreated,
  onCancel,
}: {
  onCreated: (projectId: string) => void;
  onCancel: () => void;
}) {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useListProjectsQuery();
  const [createProject] = useCreateProjectMutation();
  if (isLoading) return null;
  const submit = (settings: ProjectSettings) =>
    createProject(settings)
      .unwrap()
      .then((project) => onCreated(project.id))
      .catch(() =>
        dispatch(
          actions.notificationRequested("The project could not be created"),
        ),
      );
  return (
    <ProjectSettingsView
      mode="create"
      initialValues={newProjectSettings(data?.projects ?? [])}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );
}
