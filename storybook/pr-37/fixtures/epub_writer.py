"""Writes a minimal EPUB 3 book with one XHTML file per chapter, for the fixture build scripts.

Each chapter is a title and a list of paragraphs. Every paragraph becomes one `<p>` holding plain text,
so the paragraphs that the app's parser reads back are exactly the strings given here.
"""

import html
import zipfile
from pathlib import Path

CONTAINER = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""


def write_epub(output: Path, metadata: dict, chapters: list[tuple[str, list[str]]]):
    """Writes `chapters` to `output`. `metadata` has `identifier`, `title`, `author`, `language`, and `toc_title`."""

    # A fixed timestamp keeps the archive's bytes the same from one build to the next.
    def add(archive, name, text, compress=zipfile.ZIP_DEFLATED):
        info = zipfile.ZipInfo(name, date_time=(2026, 10, 19, 0, 0, 0))
        archive.writestr(info, text, compress_type=compress)

    language = metadata["language"]
    with zipfile.ZipFile(output, "w") as archive:
        add(archive, "mimetype", "application/epub+zip", zipfile.ZIP_STORED)
        add(archive, "META-INF/container.xml", CONTAINER)
        add(archive, "OEBPS/content.opf", content_opf(metadata, len(chapters)))
        add(archive, "OEBPS/nav.xhtml", nav_xhtml(language, metadata["toc_title"], [title for title, _ in chapters]))
        for i, (title, paragraphs) in enumerate(chapters):
            add(archive, f"OEBPS/chapter{i + 1}.xhtml", chapter_xhtml(language, title, paragraphs))


def chapter_xhtml(language, title, paragraphs):
    body = "\n".join(f"      <p>{html.escape(p, quote=False)}</p>" for p in paragraphs)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{language}">
  <head>
    <title>{html.escape(title)}</title>
  </head>
  <body>
    <section epub:type="chapter">
      <h1>{html.escape(title)}</h1>
{body}
    </section>
  </body>
</html>
"""


def nav_xhtml(language, toc_title, titles):
    items = "\n".join(f'        <li><a href="chapter{i + 1}.xhtml">{html.escape(t)}</a></li>' for i, t in enumerate(titles))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{language}">
  <head>
    <title>{html.escape(toc_title)}</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>{html.escape(toc_title)}</h1>
      <ol>
{items}
      </ol>
    </nav>
  </body>
</html>
"""


def content_opf(metadata, count):
    ids = [f"chapter{i + 1}" for i in range(count)]
    manifest = "\n".join(f'    <item id="{i}" href="{i}.xhtml" media-type="application/xhtml+xml"/>' for i in ids)
    spine = "\n".join(f'    <itemref idref="{i}"/>' for i in ids)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="{metadata["language"]}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">{metadata["identifier"]}</dc:identifier>
    <dc:title>{html.escape(metadata["title"])}</dc:title>
    <dc:creator>{html.escape(metadata["author"])}</dc:creator>
    <dc:language>{metadata["language"]}</dc:language>
    <meta property="dcterms:modified">2026-10-19T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
{manifest}
  </manifest>
  <spine>
    <itemref idref="nav"/>
{spine}
  </spine>
</package>
"""
