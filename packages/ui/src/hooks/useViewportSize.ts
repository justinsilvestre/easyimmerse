import { useEffect, useState } from "react";
import type { ViewportSize } from "../lookup/placeAtAnchor.ts";

/** The size of the window's viewport, kept up to date as the window is resized. */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState(viewportSize);
  useEffect(() => {
    const resize = () => setSize(viewportSize);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return size;
}

function viewportSize(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight };
}
