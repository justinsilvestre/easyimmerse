import type { ProjectSettings } from "@easyimmerse/types";
import { Button } from "../components/Button.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { ProjectForm } from "./ProjectForm.tsx";

/** The screen for creating a project or editing an existing project's settings. */
export function ProjectSettingsView({
  mode,
  initialValues,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initialValues: ProjectSettings;
  onSubmit: (values: ProjectSettings) => void;
  onCancel: () => void;
}) {
  return (
    <ScreenLayout
      wide
      headerActions={
        <Button variant="subtle" onClick={onCancel}>
          {mode === "create" ? "Back" : "Back to project"}
        </Button>
      }
    >
      <h1 className="text-xl font-semibold">
        {mode === "create" ? "New project" : "Project settings"}
      </h1>
      <ProjectForm
        initialValues={initialValues}
        submitLabel={mode === "create" ? "Create project" : "Save settings"}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </ScreenLayout>
  );
}
