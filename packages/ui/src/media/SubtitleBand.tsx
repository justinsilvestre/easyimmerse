import clsx from "clsx";
import type { ReactNode, Ref } from "react";
import type { SubtitleAppearance } from "./subtitleAppearance.ts";
import type { SubtitleBandPlacement } from "./subtitleBandPlacement.ts";
import { subtitleBackdropStyles } from "./subtitleBoxStyles.ts";

/**
 * The band that holds the subtitles, above the player controls at the bottom of the stage.
 * Placed below the picture, the band takes rows of its own right under it, on black like the video.
 * Placed over the picture, it lies across the picture's lower edge, above the controls, on a backdrop at the opacity the user chose,
 * which fades in above the subtitles rather than ending in a hard line
 * and reaches down behind the controls, so that no gap opens under the subtitles when the controls fold away.
 * Without an appearance, as when no subtitles show, it draws no backdrop.
 */
export function SubtitleBand({
  ref,
  placement,
  appearance,
  controlsHeight,
  children,
}: {
  ref?: Ref<HTMLDivElement>;
  placement: SubtitleBandPlacement;
  appearance: SubtitleAppearance | null;
  /** The height of the controls under the band, which it rises above when it lies over the picture. */
  controlsHeight: number;
  children: ReactNode;
}) {
  const isOverlay = placement === "overlay";
  const overlayStyles =
    appearance && isOverlay ? subtitleBackdropStyles(appearance) : null;
  return (
    <div
      ref={ref}
      data-testid="subtitle-band"
      data-placement={placement}
      style={{
        ...overlayStyles?.backdrop,
        bottom: isOverlay ? controlsHeight : undefined,
      }}
      className={clsx(
        "pointer-events-none z-10 flex flex-col",
        isOverlay ? "absolute inset-x-0" : "relative shrink-0",
        appearance && !isOverlay && "bg-black",
      )}
    >
      {overlayStyles && (
        <>
          <div
            aria-hidden
            style={overlayStyles.feather}
            className="absolute inset-x-0 bottom-full h-8"
          />
          <div
            aria-hidden
            data-testid="subtitle-band-foot"
            style={{ ...overlayStyles.backdrop, height: controlsHeight }}
            className="absolute inset-x-0 top-full"
          />
        </>
      )}
      {children}
    </div>
  );
}
