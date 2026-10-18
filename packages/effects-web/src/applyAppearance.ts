import { type Appearance, defaultTextScale } from "@easyimmerse/state";

/**
 * Builds the function that marks the root element with the theme and sets its font size to the text scale,
 * so that the stylesheet's colors for that theme apply and every measurement in rem follows the text.
 * Theme changes fade only after the first appearance has been painted, so that opening the app does not fade.
 */
export function createApplyAppearance(
  root: HTMLElement,
): (appearance: Appearance) => void {
  let isFirst = true;
  return ({ theme, textScale }) => {
    root.dataset.theme = theme;
    root.style.fontSize = textScale === defaultTextScale ? "" : `${textScale}%`;
    if (isFirst) enableThemeTransitionsAfterPaint(root);
    isFirst = false;
  };
}

/** Waits two frames, so that the browser paints the first theme without a transition, before enabling transitions. */
function enableThemeTransitionsAfterPaint(root: HTMLElement) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      root.dataset.themeTransitions = "";
    }),
  );
}
