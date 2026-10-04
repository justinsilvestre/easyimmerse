import {
  useGetProjectQuery,
  useUpdateProjectMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { ProjectSettings } from "@easyimmerse/types";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { ProjectSettingsView } from "../projects/ProjectSettingsView.tsx";

/** The form for an existing project's settings, which returns to the project once saved. */
export function ProjectSettingsScreen({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const dispatch = useAppDispatch();
  const { data: project, error } = useGetProjectQuery(projectId);
  const [updateProject] = useUpdateProjectMutation();
  if (error)
    return (
      <ScreenLayout>
        <p role="alert">Could not load the project.</p>
      </ScreenLayout>
    );
  if (project === undefined) return null;
  const submit = (settings: ProjectSettings) =>
    updateProject({ projectId, settings })
      .unwrap()
      .then(onDone)
      .catch(() =>
        dispatch(
          actions.notificationRequested("The settings could not be saved"),
        ),
      );
  return (
    <ProjectSettingsView
      mode="edit"
      initialValues={project.settings}
      onSubmit={submit}
      onCancel={onDone}
    />
  );
}
