import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { attachPlayerSource } from "./attachPlayerSource.ts";
import { useHlsLoader } from "./hlsLoaderContext.ts";
import type { PlayerSource } from "./PlayerSource.ts";

/**
 * Keeps the media element attached to the source, detaching on unmount and whenever the source changes.
 * After a change the element continues from where the previous source was, as a track switch needs.
 */
export function usePlayerSource(
  elementRef: RefObject<HTMLMediaElement | null>,
  source: PlayerSource,
  onFailure: (cause: string) => void,
): void {
  const loadHlsClass = useHlsLoader();
  const resumeAt = useRef(0);
  const latest = useRef({ source, onFailure });
  latest.current = { source, onFailure };
  // A source is the same source while its kind, URL, and credential are, whatever object carries them.
  const sourceKey = describeSource(source);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sourceKey stands for the source, which the effect reads through the ref.
  useEffect(() => {
    const element = elementRef.current;
    if (element === null) return;
    const detach = attachPlayerSource(element, latest.current.source, {
      resumeAtSeconds: resumeAt.current,
      onFailure: (cause) => latest.current.onFailure(cause),
      loadHlsClass,
    });
    return () => {
      resumeAt.current = element.currentTime;
      detach();
    };
  }, [elementRef, sourceKey, loadHlsClass]);
}

function describeSource(source: PlayerSource): string {
  const credential = source.kind === "hls" ? source.authorization : "";
  return `${source.kind} ${source.url} ${credential}`;
}
