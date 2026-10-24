import {
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * A box for a field whose text can grow long. While nothing inside it has focus, it stops at a fixed height
 * and fades out its bottom edge if that cuts its content off; with focus inside, it grows to show all of it.
 */
export function FocusExpandingBox({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isCutOff = useIsCutOff(ref);
  return (
    <div
      ref={ref}
      data-cut-off={isCutOff || undefined}
      className="max-h-32 overflow-hidden focus-within:max-h-none data-cut-off:not-focus-within:[mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]"
    >
      {children}
    </div>
  );
}

/** Tells whether the box is shorter than its content, followed as either resizes. */
function useIsCutOff(ref: RefObject<HTMLDivElement | null>): boolean {
  const [isCutOff, setCutOff] = useState(false);
  useLayoutEffect(() => {
    const box = ref.current;
    if (box === null) return;
    // One pixel of leeway, since heights with fractions of a pixel are rounded.
    const check = () => setCutOff(box.scrollHeight > box.clientHeight + 1);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(box);
    for (const child of box.children) observer.observe(child);
    return () => observer.disconnect();
  }, [ref]);
  return isCutOff;
}
