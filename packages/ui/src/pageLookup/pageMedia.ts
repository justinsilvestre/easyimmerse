import type { ResolveDictionaryMedia } from "../lookup/definition/definitionContext.ts";
import { decodePicture } from "./decodePicture.ts";

type PageMediaOptions = {
  /** Fetches a file stored with a dictionary, or resolves with null when it cannot. */
  fetchMedia: (dictionaryId: string, path: string) => Promise<Blob | null>;
  /** Called once a file has loaded, so that the pop-up can show it. */
  onLoad: () => void;
  /** Decodes a fetched file into a picture, or resolves with null when it is not one. */
  decode?: (blob: Blob) => Promise<ImageBitmap | null>;
};

/**
 * Keeps the files of the dictionaries that the pop-up on a web page shows, such as images, as decoded pictures.
 * The pictures are drawn rather than loaded from URLs, since a page's Content Security Policy may forbid the URLs.
 * The resolver it gives fetches a file the first time it is asked for and resolves it to null until it has loaded;
 * every load gives a new resolver, so that what was drawn with the last one is drawn again.
 * `forget` releases every picture decoded so far, once nothing shows them any more.
 */
export function createPageMedia({
  fetchMedia,
  onLoad,
  decode = decodePicture,
}: PageMediaOptions) {
  const pictures = new Map<string, ImageBitmap | null>();
  let generation = 0;
  const load = async (key: string, dictionaryId: string, path: string) => {
    const loading = generation;
    const blob = await fetchMedia(dictionaryId, path);
    const picture = blob && (await decode(blob));
    if (picture === null) return;
    if (loading !== generation) return picture.close();
    pictures.set(key, picture);
    resolver = createResolver();
    onLoad();
  };
  const createResolver = (): ResolveDictionaryMedia => (dictionaryId, path) => {
    const key = `${dictionaryId}\n${path}`;
    if (!pictures.has(key)) {
      pictures.set(key, null);
      void load(key, dictionaryId, path);
    }
    return pictures.get(key) ?? null;
  };
  let resolver = createResolver();
  return {
    resolver: () => resolver,
    forget: () => {
      for (const picture of pictures.values()) picture?.close();
      pictures.clear();
      generation += 1;
      resolver = createResolver();
    },
  };
}
