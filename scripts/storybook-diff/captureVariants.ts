/** A theme and viewport that every story is captured in. */
export interface CaptureVariant {
  theme: "light" | "dark";
  viewport: Viewport;
}

interface Viewport {
  name: string;
  width: number;
  height: number;
}

const viewports: Viewport[] = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

const themes = ["light", "dark"] as const;

export const captureVariants = themes.flatMap((theme) =>
  viewports.map((viewport) => ({ theme, viewport })),
) satisfies CaptureVariant[];

/** The file name of a story's screenshot in one variant, such as `dark-phone.png`. */
export function variantFileName(variant: CaptureVariant): string {
  return `${variant.theme}-${variant.viewport.name}.png`;
}

/** The moment every page's clock is fixed at, so that dates render the same in every capture. */
export const fixedTime = new Date("2026-01-15T12:00:00Z");
