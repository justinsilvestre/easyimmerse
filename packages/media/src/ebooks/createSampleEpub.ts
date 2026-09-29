import { strToU8, zipSync } from "fflate";

const container = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const packageDocument = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">sample-book</dc:identifier>
    <dc:title>Der Beispielroman</dc:title>
    <dc:language>de</dc:language>
  </metadata>
  <manifest>
    <item id="chapter-2" href="text/chapter-2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter-1" href="text/chapter-1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter-1"/>
    <itemref idref="chapter-2"/>
  </spine>
</package>`;

/** Creates the bytes of a small EPUB file for use in tests. */
export function createSampleEpub(): Uint8Array {
  return zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(packageDocument),
    "OEBPS/text/chapter-1.xhtml": strToU8(createChapter("Erstes Kapitel")),
    "OEBPS/text/chapter-2.xhtml": strToU8(createChapter("Zweites Kapitel")),
  });
}

function createChapter(heading: string): string {
  return `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>${heading}</h1></body></html>`;
}
