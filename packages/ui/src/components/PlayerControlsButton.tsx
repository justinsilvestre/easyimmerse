import clsx from "clsx";
import type { ComponentProps } from "react";
import {
  PlayerControlsIcon,
  type PlayerControlsIconName,
} from "./PlayerControlsIcon.tsx";

/** A button in the player controls, showing an icon and optionally a short text after it. Give it an `aria-label`. */
export function PlayerControlsButton({
  icon,
  isActive = false,
  className,
  children,
  ...rest
}: ComponentProps<"button"> & {
  icon: PlayerControlsIconName;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
        isActive ? "text-blue-300" : "text-neutral-200",
        className,
      )}
      {...rest}
    >
      <PlayerControlsIcon name={icon} />
      {children}
    </button>
  );
}
