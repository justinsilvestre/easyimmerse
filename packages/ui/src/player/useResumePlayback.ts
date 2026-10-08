import {
  actions,
  selectPlaybackPosition,
  selectPlayerDuration,
} from "@easyimmerse/state";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** A stored position this close to the start or the end of the file starts the file over instead. */
const resumeMarginSeconds = 5;

/**
 * Seeks a media file to where playback last was, once the player has loaded it and its stored position is known.
 * A file left within a few seconds of its start or its end starts from the beginning. The seek happens once per opening.
 */
export function useResumePlayback(mediaFileId: string): void {
  const dispatch = useAppDispatch();
  const storedMs = useAppSelector(selectPlaybackPosition(mediaFileId));
  const durationSeconds = useAppSelector(selectPlayerDuration);
  const hasResumed = useRef(false);
  useEffect(() => {
    dispatch(actions.playbackPositionLoadRequested(mediaFileId));
  }, [dispatch, mediaFileId]);
  useEffect(() => {
    if (hasResumed.current || storedMs == null || durationSeconds === 0) return;
    hasResumed.current = true;
    const seconds = storedMs / 1000;
    if (
      seconds > resumeMarginSeconds &&
      seconds < durationSeconds - resumeMarginSeconds
    )
      dispatch(actions.seekRequested(seconds));
  }, [dispatch, storedMs, durationSeconds]);
}
