import {
  skipToken,
  useCreateProjectMutation,
  useGetProjectQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { ProjectSummary } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { defaultProjectSettings } from "../projects/defaultProjectSettings.ts";
import type { ProjectFormValues } from "../projects/editProject.ts";
import { ProjectSettingsView } from "../projects/ProjectSettingsView.tsx";
import { ScreenMessage } from "./ScreenMessage.tsx";

/** The form for a new project, filled in with the settings of the project created last. */
export function NewProjectScreen({
  onCreated,
  onCancel,
}: {
  onCreated: (projectId: string) => void;
  onCancel: () => void;
}) {
  const dispatch = useAppDispatch();
  const initialValues = useInitialValues();
  const [createProject] = useCreateProjectMutation();
  // The form keeps its own state from its initial values, so it mounts only once they are known.
  if (initialValues === null)
    return (
      <ScreenMessage status="loading" message="Loading…" onBack={onCancel} />
    );
  return (
    <ProjectSettingsView
      mode="create"
      initialValues={initialValues}
      onSubmit={({ name, ...settings }) => {
        createProject({ name, settings })
          .unwrap()
          .then((project) => onCreated(project.id))
          .catch(() =>
            dispatch(
              actions.notificationRequested("The project could not be created"),
            ),
          );
      }}
      onCancel={onCancel}
    />
  );
}

/** The last created project's settings with an empty name, the defaults without one, or null while loading. */
function useInitialValues(): ProjectFormValues | null {
  const projects = useListProjectsQuery();
  const lastId = projects.data
    ? lastCreatedProjectId(projects.data.projects)
    : null;
  const last = useGetProjectQuery(lastId ?? skipToken);
  if (projects.isLoading || (lastId !== null && last.isLoading)) return null;
  const settings =
    last.data?.settings ?? defaultProjectSettings(navigator.language);
  return { name: "", ...settings };
}

function lastCreatedProjectId(
  projects: readonly ProjectSummary[],
): string | null {
  const last = projects.reduce<ProjectSummary | null>(
    (latest, project) =>
      latest === null || project.created_at_ms > latest.created_at_ms
        ? project
        : latest,
    null,
  );
  return last?.id ?? null;
}
