import { actions } from "@easyimmerse/state";
import type { TimeRange } from "@easyimmerse/types";
import { type ReactNode, useRef, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { usePlayerElementEvents } from "../hooks/usePlayerElementEvents.ts";
import { usePlayerHandleRegistration } from "../hooks/usePlayerHandleRegistration.ts";
import { usePlayerSettingsSync } from "../hooks/usePlayerSettingsSync.ts";
import { AudioArtwork } from "./AudioArtwork.tsx";

/**
 * Plays video or audio and registers itself as the app's player, reporting its time, duration, and playing state to the store.
 * The children, such as subtitles, show over the bottom of a video or below the artwork of audio.
 */
export function MediaPlayer({
  kind,
  src,
  children,
}: {
  kind: "video" | "audio";
  src: string;
  children?: ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [element, setElement] = useState<HTMLMediaElement | null>(null);
  const loop = useRef<TimeRange | null>(null);
  usePlayerHandleRegistration(element, loop);
  usePlayerSettingsSync(element);
  const events = usePlayerElementEvents(loop);
  if (kind === "audio")
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-black px-4 py-8">
        <AudioArtwork />
        <audio ref={setElement} src={src} preload="metadata" {...events} />
        {children}
      </div>
    );
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
      <video
        ref={setElement}
        src={src}
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
