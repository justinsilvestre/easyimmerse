import clsx from "clsx";
import type { ReactNode, Ref } from "react";
import type { SubtitleAppearance } from "./subtitleAppearance.ts";
import type { SubtitleBandPlacement } from "./subtitleBandPlacement.ts";
import { subtitleBackdropStyles } from "./subtitleBoxStyles.ts";

/**
 * The band that holds the subtitles and the player controls under them.
 * Placed below the picture, the band takes rows of its own right under it, on the same surface as the controls.
 * Placed over the picture, it lies across the picture's lower edge on a backdrop at the opacity the user chose,
 * which fades in above the subtitles rather than ending in a hard line.
 * Either backdrop covers the controls' place too, so that no gap opens under the subtitles when the controls fold away.
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
  const overlayStyles =
    appearance && placement === "overlay"
      ? subtitleBackdropStyles(appearance)
      : null;
  return (
    <div
      ref={ref}
      data-testid="subtitle-band"
      data-placement={placement}
      style={overlayStyles?.backdrop}
      className={clsx(
        "pointer-events-none z-10 flex flex-col",
        placement === "overlay"
          ? "absolute inset-x-0 bottom-0"
          : "relative shrink-0",
        appearance && placement === "below" && "bg-surface",
      )}
    >
      {overlayStyles && (
        <div
          aria-hidden
          style={overlayStyles.feather}
          className="absolute inset-x-0 bottom-full h-8"
        />
      )}
      {children}
    </div>
  );
}
