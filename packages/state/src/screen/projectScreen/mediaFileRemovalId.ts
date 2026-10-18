/** The id of the request that removes a media file from its project. It names the file, so that removals of two files run side by side. */
export function mediaFileRemovalId(
  projectId: string,
  mediaFileId: string,
): string {
  return `project/${projectId}/removeMediaFile/${mediaFileId}`;
}
