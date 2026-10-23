import type { Plugin } from "vite";
import { remToPx } from "./remToPx.ts";

/**
 * Builds a Vite plugin that rewrites rem as pixels, at the given size of a rem, in the emitted stylesheets whose file names match.
 * A stylesheet shown inside someone else's page, such as a browser extension's content script, then keeps its sizes whatever the page's root font size.
 */
export function remToPxPlugin(options: {
  fileNames: RegExp;
  remPx: number;
}): Plugin {
  return {
    name: "easyimmerse:rem-to-px",
    enforce: "post",
    generateBundle(_outputOptions, bundle) {
      for (const file of Object.values(bundle))
        if (file.type === "asset" && options.fileNames.test(file.fileName))
          file.source = remToPx(sourceText(file.source), options.remPx);
    },
  };
}

function sourceText(source: string | Uint8Array): string {
  return typeof source === "string" ? source : new TextDecoder().decode(source);
}
