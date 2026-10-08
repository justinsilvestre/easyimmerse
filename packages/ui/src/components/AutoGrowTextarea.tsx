import {
  type ComponentProps,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";

/**
 * A one-row textarea that grows to fit its text, so a short value takes no more room than an input.
 * It fits its height again only when its text or its width changes, so that other renders leave the page around it alone.
 */
export function AutoGrowTextarea(
  props: Omit<ComponentProps<"textarea">, "ref" | "rows">,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { value } = props;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the height follows the text, which the effect reads from the element.
  useLayoutEffect(() => {
    if (ref.current) fitHeight(ref.current);
  }, [value]);
  useFitOnWidthChange(ref);
  return <textarea ref={ref} rows={1} {...props} />;
}

/**
 * Sets the textarea's height to that of its text.
 * Measuring collapses the textarea for a moment, so its parent keeps its height meanwhile:
 * otherwise a scrolling container around it would shrink and lose its scroll position.
 */
function fitHeight(element: HTMLTextAreaElement) {
  const parent = element.parentElement;
  const parentMinHeight = parent?.style.minHeight ?? "";
  if (parent) parent.style.minHeight = `${parent.offsetHeight}px`;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
  if (parent) parent.style.minHeight = parentMinHeight;
}

/** Fits the textarea's height again whenever its width changes, which rewraps its text. */
function useFitOnWidthChange(ref: RefObject<HTMLTextAreaElement | null>) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === "undefined") return;
    let width = element.offsetWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth === width) return;
      width = element.offsetWidth;
      // Deferred to the next frame, since changing the height inside the observer's callback would notify it again at once.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitHeight(element));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}
