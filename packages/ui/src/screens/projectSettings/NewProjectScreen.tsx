import { useListProjectsQuery } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { newProjectSettings } from "./newProjectSettings.ts";
import { ProjectSettingsView } from "./ProjectSettingsView.tsx";

/** The new project form, filled in from the last created project. The route opens the project once it is created. */
export function NewProjectScreen({ onCancel }: { onCancel: () => void }) {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useListProjectsQuery();
  if (isLoading) return null;
  return (
    <ProjectSettingsView
      mode="create"
      initialValues={newProjectSettings(data?.projects ?? [])}
      onSubmit={(settings) => dispatch(actions.projectFormSubmitted(settings))}
      onCancel={onCancel}
    />
  );
}
