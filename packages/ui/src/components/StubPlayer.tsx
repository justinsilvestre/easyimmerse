import { actions, selectCurrentTime } from "@easyimmerse/state";
import { useEffect } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { usePlayerRegistry } from "../playerRegistryContext.ts";

/** Formats seconds as `m:ss.s`, for example 61.75 becomes `1:01.8`. Rounding happens before the minutes are split off, so 59.96 becomes `1:00.0`. */
export function formatPlayerTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = ((tenths % 600) / 10).toFixed(1).padStart(4, "0");
  return `${minutes}:${rest}`;
}

/** Stands in for a real media element: it only tracks the time it was told to seek to. */
export function StubPlayer() {
  const dispatch = useAppDispatch();
  const registry = usePlayerRegistry();
  const currentTime = useAppSelector(selectCurrentTime);
  useEffect(
    () =>
      registry.register({
        seek: (seconds) => dispatch(actions.playerTimeChanged(seconds)),
      }),
    [registry, dispatch],
  );
  return (
    <section
      aria-label="Player"
      className="rounded bg-gray-900 p-6 font-mono text-2xl text-white"
    >
      {formatPlayerTime(currentTime)}
    </section>
  );
}
