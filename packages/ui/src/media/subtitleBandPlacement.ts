/**
 * Where the media screen puts the band of subtitles:
 * in rows of their own under the picture, or over the picture's lower edge.
 */
export type SubtitleBandPlacement = "below" | "overlay";

type Size = { width: number; height: number };

/** How far, in CSS pixels, the band may fall short of fitting, so that rounding does not tip the placement. */
const roundingTolerance = 1;

/**
 * Places the band under the picture when the stage can hold the band, and the player controls under it,
 * under a picture as wide as the stage, and over the picture otherwise,
 * so that a short, wide stage does not shrink the picture to make room.
 * Without the picture's proportions, as for an audio file, the band goes under whatever the stage shows.
 */
export function subtitleBandPlacement(
  stage: Size,
  pictureAspectRatio: number | null,
  bandHeight: number,
  controlsHeight: number,
): SubtitleBandPlacement {
  if (pictureAspectRatio === null) return "below";
  const pictureHeight = Math.min(
    pictureHeightAt(stage.width, pictureAspectRatio),
    stage.height,
  );
  const roomBelow = stage.height - pictureHeight;
  return roomBelow + roundingTolerance >= bandHeight + controlsHeight
    ? "below"
    : "overlay";
}

/** The height of a picture of the given proportions, as width over height, shown at the given width. */
export function pictureHeightAt(width: number, aspectRatio: number): number {
  return width / aspectRatio;
}
