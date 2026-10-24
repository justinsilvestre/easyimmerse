import type { ErrorData } from "hls.js";
import type { HlsClass } from "./loadHls.ts";

export type HlsFailureHandler = (cause: string) => void;

/**
 * Feeds an HLS playlist to the media element through hls.js, sending the bearer header with every request.
 * A first fatal media error is recovered once; any other fatal error is reported as a plain sentence.
 * Returns a function that destroys the hls.js instance.
 */
export function attachHls(
  Hls: HlsClass,
  element: HTMLMediaElement,
  source: { url: string; authorization: string },
  onFailure: HlsFailureHandler,
  log: (...parts: unknown[]) => void = console.error,
): () => void {
  if (!Hls.isSupported()) {
    onFailure("This browser cannot play converted media.");
    return () => undefined;
  }
  const hls = new Hls({
    xhrSetup: (xhr) =>
      xhr.setRequestHeader("Authorization", source.authorization),
  });
  let recovered = false;
  hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
    log("hls.js error", data.type, data.details, data.fatal ? "fatal" : "");
    if (!data.fatal) return;
    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) {
      recovered = true;
      hls.recoverMediaError();
      return;
    }
    onFailure(describeHlsFailure(data.type, Hls));
  });
  hls.loadSource(source.url);
  hls.attachMedia(element);
  return () => hls.destroy();
}

function describeHlsFailure(type: string, Hls: HlsClass): string {
  if (type === Hls.ErrorTypes.NETWORK_ERROR)
    return "The converted stream could not be loaded from the server.";
  if (type === Hls.ErrorTypes.MEDIA_ERROR)
    return "The converted stream could not be decoded.";
  return "The converted stream stopped unexpectedly.";
}
