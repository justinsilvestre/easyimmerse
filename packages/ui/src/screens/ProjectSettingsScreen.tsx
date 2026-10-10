import { useGetProjectQuery } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { ProjectSettingsView } from "../projects/ProjectSettingsView.tsx";

/** The form for an existing project's settings, which returns to the project once saved. `onDone` leaves without saving. */
export function ProjectSettingsScreen({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const dispatch = useAppDispatch();
  const { data: project, error } = useGetProjectQuery(projectId);
  if (error)
    return (
      <ScreenLayout>
        <p role="alert">Could not load the project.</p>
      </ScreenLayout>
    );
  if (project === undefined) return null;
  return (
    <ProjectSettingsView
      mode="edit"
      initialValues={project.settings}
      onSubmit={(settings) => dispatch(actions.projectFormSubmitted(settings))}
      onCancel={onDone}
    />
  );
}
