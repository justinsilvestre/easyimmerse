import { useAddMediaFileMutation } from "@easyimmerse/backend";
import { actions, guessMediaKind } from "@easyimmerse/state";
import { useAppDispatch } from "./useAppDispatch.ts";
import type { ChosenFileHandler } from "./useChosenFileHandler.ts";

/** Returns a handler that adds a chosen media file to the open project and opens it. */
export function useAddChosenMedia(): ChosenFileHandler {
  const dispatch = useAppDispatch();
  const [addMediaFile] = useAddMediaFileMutation();
  return async ({ file }, screen) => {
    if (screen.kind !== "project" && screen.kind !== "media")
      throw new Error("Open a project first.");
    const kind = guessMediaKind(file.name);
    if (kind === null) {
      dispatch(actions.notificationRequested("Unsupported file type"));
      return;
    }
    const { projectId } = screen;
    const media = await addMediaFile({
      projectId,
      media: { name: file.name, kind, source: file.source },
    }).unwrap();
    dispatch(actions.mediaOpened(projectId, media));
  };
}
