import type { ProjectSettings } from "@easyimmerse/types";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { ProjectForm } from "./ProjectForm.tsx";

/** The screen for creating a project or editing an existing project's settings. Back leads to the projects or to the project. */
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
      onBack={onCancel}
      backLabel={mode === "create" ? "Projects" : "Project"}
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
