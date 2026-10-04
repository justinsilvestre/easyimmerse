import {
  useGetProjectQuery,
  useUpdateProjectMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { ProjectSettingsView } from "../projects/ProjectSettingsView.tsx";
import { ScreenMessage } from "./ScreenMessage.tsx";

/** The form for changing a project's name and settings. */
export function ProjectSettingsScreen({
  projectId,
  onDone,
}: {
  projectId: string;
  /** Returns to the project, after saving or instead of it. */
  onDone: () => void;
}) {
  const dispatch = useAppDispatch();
  const { data: project, isLoading } = useGetProjectQuery(projectId);
  const [updateProject] = useUpdateProjectMutation();
  if (isLoading)
    return (
      <ScreenMessage status="loading" message="Loading…" onBack={onDone} />
    );
  if (!project)
    return (
      <ScreenMessage
        status="failed"
        message="Could not load the project."
        onBack={onDone}
      />
    );
  return (
    <ProjectSettingsView
      mode="edit"
      initialValues={{ name: project.name, ...project.settings }}
      onSubmit={({ name, ...settings }) => {
        updateProject({ projectId, request: { name, settings } })
          .unwrap()
          .then(onDone)
          .catch(() =>
            dispatch(
              actions.notificationRequested(
                "The project settings could not be saved",
              ),
            ),
          );
      }}
      onCancel={onDone}
    />
  );
}
