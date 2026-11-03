/** Returns the id of the request that adds a media file picked for a project. */
export const mediaFileAddId = (projectId: string) =>
  `project/${projectId}/addMediaFile`;
