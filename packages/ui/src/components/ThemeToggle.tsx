import { actions, selectTheme } from "@easyimmerse/state";
import clsx from "clsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** Switches between the light and dark themes until the operating system's theme next changes. */
export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const isDark = useAppSelector(selectTheme) === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={() => dispatch(actions.themeToggled())}
      className="flex items-center gap-2 rounded-md px-1 py-0.5 text-xs text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Dark mode
      <span
        aria-hidden
        className={clsx(
          "flex h-4 w-7 items-center rounded-full p-0.5 transition motion-reduce:transition-none",
          isDark ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={clsx(
            "size-3 rounded-full bg-on-accent shadow-sm transition motion-reduce:transition-none",
            isDark && "translate-x-3",
          )}
        />
      </span>
    </button>
  );
}
