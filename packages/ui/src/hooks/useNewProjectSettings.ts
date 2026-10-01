import {
  skipToken,
  useGetProjectQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import type { ProjectSettings, ProjectSummary } from "@easyimmerse/types";
import { createDefaultProjectSettings } from "../components/createDefaultProjectSettings.ts";
import { useInterfaceLanguage } from "./useInterfaceLanguage.ts";

/**
 * Returns the settings the new-project form starts with, or null while they load.
 * They copy the most recently created project, without its name, or else default to translating into the interface language.
 */
export function useNewProjectSettings(): ProjectSettings | null {
  const interfaceLanguage = useInterfaceLanguage();
  const projects = useListProjectsQuery();
  const newest = findNewest(projects.data?.projects ?? []);
  const project = useGetProjectQuery(newest?.id ?? skipToken);
  if (projects.isLoading || project.isLoading) return null;
  if (project.data) return { ...project.data.settings, name: "" };
  return createDefaultProjectSettings(interfaceLanguage);
}

function findNewest(
  projects: readonly ProjectSummary[],
): ProjectSummary | undefined {
  return projects.reduce<ProjectSummary | undefined>(
    (newest, project) =>
      newest === undefined ||
      Date.parse(project.created_at) > Date.parse(newest.created_at)
        ? project
        : newest,
    undefined,
  );
}
