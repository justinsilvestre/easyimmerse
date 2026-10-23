import { transform } from "lightningcss";

/**
 * Rewrites every length in rem in a stylesheet as pixels at the given size of a rem, and minifies the stylesheet.
 * A stylesheet rewritten so no longer depends on the font size of the page's root element.
 */
export function remToPx(css: string, remPx: number): string {
  const { code } = transform({
    filename: "stylesheet.css",
    code: new TextEncoder().encode(css),
    minify: true,
    visitor: {
      Length: (length) =>
        length.unit === "rem"
          ? { unit: "px", value: length.value * remPx }
          : length,
    },
  });
  return new TextDecoder().decode(code);
}
