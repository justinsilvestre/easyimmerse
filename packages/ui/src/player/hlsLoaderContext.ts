import { createContext, useContext } from "react";
import type { HlsClass } from "./loadHls.ts";
import { loadHls } from "./loadHls.ts";

/** How the player obtains the hls.js class. Tests and stories provide a fake; the app uses the lazy import. */
export const HlsLoaderContext = createContext<() => Promise<HlsClass>>(loadHls);

export function useHlsLoader(): () => Promise<HlsClass> {
  return useContext(HlsLoaderContext);
}
