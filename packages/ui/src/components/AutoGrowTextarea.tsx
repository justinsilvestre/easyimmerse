import { type ComponentProps, useLayoutEffect, useRef } from "react";

/** A one-row textarea that grows to fit its text, so a short value takes no more room than an input. */
export function AutoGrowTextarea(
  props: Omit<ComponentProps<"textarea">, "ref" | "rows">,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // The height is measured after every render, since the text can change through the value or the width.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  });
  return <textarea ref={ref} rows={1} {...props} />;
}
