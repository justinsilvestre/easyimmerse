import type { SyncConflict } from "@easyimmerse/types";

/** The conflicts of one media file. */
type MediaFileConflicts = { mediaFileName: string; conflicts: SyncConflict[] };

/**
 * The conflicts of one project, or of no project when `projectName` is null:
 * those that belong to none of its media files, then those of each media file.
 */
type ProjectConflicts = {
  projectName: string | null;
  conflicts: SyncConflict[];
  mediaFiles: MediaFileConflicts[];
};

/**
 * Groups the conflicts by project, and within a project by media file, keeping their order.
 * Projects and media files come in the order of their first conflict, and the conflicts of no project come last.
 */
export function groupSyncConflicts(
  conflicts: SyncConflict[],
): ProjectConflicts[] {
  const projects = new Map<string | null, ProjectConflicts>();
  for (const conflict of conflicts) {
    const project = projectOf(projects, conflict.project_name);
    if (conflict.media_file_name === null) project.conflicts.push(conflict);
    else
      mediaFileOf(project, conflict.media_file_name).conflicts.push(conflict);
  }
  return [...projects.values()].sort(
    (a, b) => Number(a.projectName === null) - Number(b.projectName === null),
  );
}

function projectOf(
  projects: Map<string | null, ProjectConflicts>,
  projectName: string | null,
): ProjectConflicts {
  const known = projects.get(projectName);
  if (known) return known;
  const project: ProjectConflicts = {
    projectName,
    conflicts: [],
    mediaFiles: [],
  };
  projects.set(projectName, project);
  return project;
}

function mediaFileOf(
  project: ProjectConflicts,
  mediaFileName: string,
): MediaFileConflicts {
  const known = project.mediaFiles.find(
    (mediaFile) => mediaFile.mediaFileName === mediaFileName,
  );
  if (known) return known;
  const mediaFile: MediaFileConflicts = { mediaFileName, conflicts: [] };
  project.mediaFiles.push(mediaFile);
  return mediaFile;
}
