import {
  type BackendResult,
  base64ToBytes,
  bytesToBase64,
  createServerFetch,
  dictionaryMediaPath,
  readBackendError,
} from "@easyimmerse/backend";
import type { ServerConfig } from "@easyimmerse/state";
import {
  type DictionaryMedia,
  type FetchDictionaryMediaMessage,
  isFetchDictionaryMediaMessage,
} from "./fetchDictionaryMediaMessage.ts";
import { createServerMessageListener } from "./serverMessageListener.ts";

/**
 * Builds the background script's listener that answers each message for a dictionary's file with the file from the server that `resolveServer` names.
 * The token goes to the server in a header, so that it never reaches the page the file is shown on.
 * With `rasterizeSvg`, an SVG image is answered as the PNG it draws, for a content script that cannot decode SVG itself.
 */
export function createDictionaryMediaListener(
  resolveServer: () => Promise<ServerConfig | null>,
  fetchFn?: typeof fetch,
  rasterizeSvg?: RasterizeSvg,
) {
  return createServerMessageListener(
    isFetchDictionaryMediaMessage,
    async (message, server) => {
      const answer = await fetchMedia(message, server, fetchFn);
      return "data" in answer && rasterizeSvg
        ? { data: await rasterized(answer.data, rasterizeSvg) }
        : answer;
    },
    resolveServer,
  );
}

/** Draws the bytes of an SVG image into the bytes of a PNG image. */
export type RasterizeSvg = (svg: Uint8Array) => Promise<Uint8Array>;

/** The PNG an SVG file draws, or any other file as it is, also when the SVG cannot be drawn. */
async function rasterized(
  media: DictionaryMedia,
  rasterizeSvg: RasterizeSvg,
): Promise<DictionaryMedia> {
  if (!media.contentType.startsWith("image/svg+xml")) return media;
  try {
    const png = await rasterizeSvg(base64ToBytes(media.base64));
    return { base64: bytesToBase64(png), contentType: "image/png" };
  } catch {
    return media;
  }
}

async function fetchMedia(
  { dictionaryId, path }: FetchDictionaryMediaMessage,
  server: ServerConfig,
  fetchFn: typeof fetch | undefined,
): Promise<BackendResult<DictionaryMedia>> {
  try {
    const response = await createServerFetch(
      server,
      fetchFn,
    )(dictionaryMediaPath(dictionaryId, path));
    if (!response.ok) return { error: await readBackendError(response) };
    return { data: await mediaOf(response) };
  } catch (cause) {
    return { error: { status: "NETWORK", message: String(cause) } };
  }
}

async function mediaOf(response: Response): Promise<DictionaryMedia> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  return { base64: bytesToBase64(bytes), contentType };
}
