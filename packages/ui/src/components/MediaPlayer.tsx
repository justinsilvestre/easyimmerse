import type { MediaPlayback, PlayerLoop } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import { type ReactNode, useRef } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useHlsPlayback } from "../hooks/useHlsPlayback.ts";
import { usePlayerElementEvents } from "../hooks/usePlayerElementEvents.ts";
import { usePlayerHandleRegistration } from "../hooks/usePlayerHandleRegistration.ts";
import { usePlayerSettingsSync } from "../hooks/usePlayerSettingsSync.ts";
import { AudioArtwork } from "./AudioArtwork.tsx";

/**
 * Plays video or audio and registers itself as the app's player, reporting its time, duration, and playing state to the store.
 * The children, such as subtitles, show over the bottom of a video or below the artwork of audio.
 * It plays a direct URL as the element's source and an HLS stream through hls.js. Without a playback it renders the player without media.
 */
export function MediaPlayer({
  kind,
  playback,
  children,
}: {
  kind: "video" | "audio";
  playback: MediaPlayback | null;
  children?: ReactNode;
}) {
  const dispatch = useAppDispatch();
  const media = useRef<HTMLMediaElement | null>(null);
  const loop = useRef<PlayerLoop | null>(null);
  const attachMedia = usePlayerHandleRegistration(media, loop);
  usePlayerSettingsSync(media);
  const events = usePlayerElementEvents(loop);
  useHlsPlayback(media, playback?.kind === "hls" ? playback : null);
  const mediaSrc = playback?.kind === "direct" ? playback.url : undefined;
  if (kind === "audio")
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-black px-4 py-8">
        <AudioArtwork />
        <audio
          ref={attachMedia}
          src={mediaSrc}
          preload="metadata"
          {...events}
        />
        {children}
      </div>
    );
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
      <video
        ref={attachMedia}
        src={mediaSrc}
        preload="metadata"
        playsInline
        className="block max-h-[70vh] w-full object-contain group-[:fullscreen]/view:h-full group-[:fullscreen]/view:max-h-none"
        onClick={() => dispatch(actions.togglePlayRequested())}
        {...events}
      />
      {children && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[6%] flex justify-center px-4">
          {children}
        </div>
      )}
    </div>
  );
}
