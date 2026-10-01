import { actions } from "@easyimmerse/state";
import type { SyntheticEvent } from "react";
import { describeMediaElementError } from "./describeMediaElementError.ts";
import { useAppDispatch } from "./useAppDispatch.ts";

/** Returns an error handler for a media element that logs the element's error and reports a message for the user to the store. */
export function useMediaElementErrorReport() {
  const dispatch = useAppDispatch();
  return ({ currentTarget }: SyntheticEvent<HTMLMediaElement>) => {
    const code = currentTarget.error?.code;
    const message = currentTarget.error?.message;
    console.error("The media failed to play.", { code, message });
    dispatch(actions.playerPlaybackFailed(describeMediaElementError(code)));
  };
}
