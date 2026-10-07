import clsx from "clsx";
import type { ReactNode, Ref } from "react";
import type { SubtitleAppearance } from "./subtitleAppearance.ts";
import type { SubtitleBandPlacement } from "./subtitleBandPlacement.ts";
import { subtitleBackdropStyles } from "./subtitleBoxStyles.ts";

/**
 * The band across the foot of the media stage that holds the subtitles and the player controls under them.
 * Its backdrop, in the subtitle box's color, reaches the bottom of the stage, so that no gap opens under the subtitles when the controls fold away.
 * Placed below the picture, the band takes rows of its own.
 * Placed over the picture, it lies across the picture's lower edge, and its backdrop fades in above the subtitles rather than ending in a hard line.
 * Without an appearance, as when no subtitles show, it draws no backdrop.
 */
export function SubtitleBand({
  ref,
  placement,
  appearance,
  children,
}: {
  ref?: Ref<HTMLDivElement>;
  placement: SubtitleBandPlacement;
  appearance: SubtitleAppearance | null;
  children: ReactNode;
}) {
  const styles = appearance && subtitleBackdropStyles(appearance);
  return (
    <div
      ref={ref}
      data-testid="subtitle-band"
      data-placement={placement}
      style={styles?.backdrop}
      className={clsx(
        "pointer-events-none z-10 flex flex-col",
        placement === "overlay"
          ? "absolute inset-x-0 bottom-0"
          : "relative shrink-0",
      )}
    >
      {styles && placement === "overlay" && (
        <div
          aria-hidden
          style={styles.feather}
          className="absolute inset-x-0 bottom-full h-8"
        />
      )}
      {children}
    </div>
  );
}
