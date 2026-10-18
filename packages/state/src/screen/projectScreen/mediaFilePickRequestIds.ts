/** Returns the ids of the requests that a media file picked for a project sends. */
export const mediaFilePickRequestIds = (projectId: string) => ({
  list: `project/${projectId}/listMediaFiles`,
  add: `project/${projectId}/addMediaFile`,
});
