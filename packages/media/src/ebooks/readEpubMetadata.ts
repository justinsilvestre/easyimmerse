import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";

export type EpubMetadata = {
  title: string;
  language: string | null;
  /** The paths of the book's content documents within the EPUB archive, in reading order. */
  contentDocumentsPaths: string[];
};

type ManifestItem = { "@_id": string; "@_href": string };
type SpineItemReference = { "@_idref": string };

const containerPath = "META-INF/container.xml";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (tagName) => tagName === "item" || tagName === "itemref",
});

/** Reads the title, language, and reading order of an EPUB ebook from the bytes of its file. */
export function readEpubMetadata(epubBytes: Uint8Array): EpubMetadata {
  const files = unzipSync(epubBytes);
  const packagePath = readPackagePath(files);
  const { metadata, manifest, spine } = readXml(files, packagePath).package;
  return {
    title: readText(metadata.title),
    language: metadata.language ? readText(metadata.language) : null,
    contentDocumentsPaths: spine.itemref.map((reference: SpineItemReference) =>
      resolveItemPath(packagePath, manifest.item, reference),
    ),
  };
}

/** Finds the path of the package document, which describes the contents of the book. */
function readPackagePath(files: Record<string, Uint8Array>): string {
  const { container } = readXml(files, containerPath);
  return container.rootfiles.rootfile["@_full-path"];
}

// biome-ignore lint/suspicious/noExplicitAny: The parser returns untyped data.
function readXml(files: Record<string, Uint8Array>, path: string): any {
  const file = files[path];
  if (!file) throw new Error(`The EPUB file is missing "${path}".`);
  return xmlParser.parse(strFromU8(file));
}

/** Elements with attributes are parsed into objects holding their text under `#text`. */
function readText(element: string | { "#text": string }): string {
  return typeof element === "string" ? element : element["#text"];
}

function resolveItemPath(
  packagePath: string,
  manifestItems: ManifestItem[],
  reference: SpineItemReference,
): string {
  const item = manifestItems.find(
    (item) => item["@_id"] === reference["@_idref"],
  );
  if (!item)
    throw new Error(`The EPUB file is missing item "${reference["@_idref"]}".`);
  const packageDirectory = packagePath.slice(
    0,
    packagePath.lastIndexOf("/") + 1,
  );
  return packageDirectory + item["@_href"];
}
