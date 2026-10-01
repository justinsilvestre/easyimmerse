import type { MediaPlayback } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type Hls from "hls.js";
import { type RefObject, useEffect } from "react";
import { describeStreamError } from "./describeStreamError.ts";
import { useAppDispatch } from "./useAppDispatch.ts";

type HlsPlayback = Extract<MediaPlayback, { kind: "hls" }>;

/**
 * Plays the HLS stream (HTTP Live Streaming) in the media element through hls.js, which loads only when a stream is given.
 * The stream stops when the component unmounts or the stream's URL or token changes. Errors that stop playback go to the store as messages for the user and to the console in full.
 */
export function useHlsPlayback(
  media: RefObject<HTMLMediaElement | null>,
  stream: HlsPlayback | null,
) {
  const dispatch = useAppDispatch();
  const url = stream?.url;
  const token = stream?.token;
  useEffect(() => {
    const element = media.current;
    if (url === undefined || token === undefined || element === null) return;
    const report = (message: string) =>
      dispatch(actions.playerPlaybackFailed(message));
    let hls: Hls | null = null;
    let isStopped = false;
    import("hls.js")
      .then(({ default: HlsPlayer }) => {
        // The import can resolve after the component unmounted or the stream changed.
        if (!isStopped)
          hls = startHls(HlsPlayer, element, { url, token }, report);
      })
      .catch((error: unknown) => {
        console.error("hls.js failed to load.", error);
        report("The player for converted streams failed to load.");
      });
    return () => {
      isStopped = true;
      hls?.destroy();
    };
  }, [media, url, token, dispatch]);
}

function startHls(
  HlsPlayer: typeof Hls,
  element: HTMLMediaElement,
  { url, token }: { url: string; token: string },
  report: (message: string) => void,
): Hls | null {
  if (!HlsPlayer.isSupported()) {
    report("This player cannot play converted streams.");
    return null;
  }
  const hls = new HlsPlayer({
    xhrSetup: (xhr) => xhr.setRequestHeader("Authorization", `Bearer ${token}`),
  });
  let hasRecoveredMediaError = false;
  hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
    const { fatal, type } = data;
    if (!fatal) return;
    // hls.js can often resume after a decoding error by resetting the media buffer, so it gets one retry.
    if (type === HlsPlayer.ErrorTypes.MEDIA_ERROR && !hasRecoveredMediaError) {
      hasRecoveredMediaError = true;
      hls.recoverMediaError();
      return;
    }
    console.error("The converted stream failed.", data);
    report(describeStreamError(type));
  });
  hls.loadSource(url);
  hls.attachMedia(element);
  return hls;
}
