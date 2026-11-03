"""Builds ginga-tetsudo-no-yoru.epub from Aozora Bunko's XHTML edition of 銀河鉄道の夜.

Usage: python3 fixtures/build-ginga-tetsudo-no-yoru.py <456_15050.html>
The input is the Shift_JIS file from https://www.aozora.gr.jp/cards/000081/files/456_15050.html.
Ruby readings are dropped, since the reader shows only the base text.
"""

import html
import re
import sys
import zipfile
from pathlib import Path

OUTPUT = Path(__file__).parent / "ginga-tetsudo-no-yoru.epub"
TITLE = "銀河鉄道の夜"
AUTHOR = "宮沢賢治"

CONTAINER = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""


def main(source_path):
    source = Path(source_path).read_bytes().decode("shift_jis")
    main_text = between(source, '<div class="main_text">', '<div class="bibliographical_information">')
    credits = between(source, '<div class="bibliographical_information">', '<div class="notation_notes">')
    sections = re.split(r'<div class="jisage_3"[^>]*><h4[^>]*>(.*?)</h4></div>', main_text)[1:]
    chapters = [(plain_text(sections[i]), paragraphs_of(sections[i + 1])) for i in range(0, len(sections), 2)]
    chapters.append(("底本・クレジット", paragraphs_of(credits)))
    write_epub(chapters)


def between(text, start, end):
    return text[text.index(start) + len(start) : text.index(end)]


def plain_text(markup):
    markup = re.sub(r"<rp>.*?</rp>|<rt>.*?</rt>", "", markup)
    markup = re.sub(r'<img [^>]*alt="小書き平仮名ん"[^>]*/>', "ん", markup)
    markup = re.sub(r'<span class="notes">.*?</span>', "", markup)
    return html.unescape(re.sub(r"<[^>]+>", "", markup)).strip()


def paragraphs_of(markup):
    lines = (plain_text(line) for line in re.split(r"<br\s*/>", markup))
    return [line for line in lines if line]


def chapter_xhtml(title, paragraphs):
    body = "\n".join(f"      <p>{html.escape(p, quote=False)}</p>" for p in paragraphs)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja">
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


def nav_xhtml(titles):
    items = "\n".join(f'        <li><a href="chapter{i + 1}.xhtml">{html.escape(t)}</a></li>' for i, t in enumerate(titles))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja">
  <head>
    <title>目次</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>目次</h1>
      <ol>
{items}
      </ol>
    </nav>
  </body>
</html>
"""


def content_opf(count):
    ids = [f"chapter{i + 1}" for i in range(count)]
    manifest = "\n".join(f'    <item id="{i}" href="{i}.xhtml" media-type="application/xhtml+xml"/>' for i in ids)
    spine = "\n".join(f'    <itemref idref="{i}"/>' for i in ids)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="ja">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:3e9b7c41-58d2-4f0a-9c6e-b1a2d4f7e860</dc:identifier>
    <dc:title>{TITLE}</dc:title>
    <dc:creator>{AUTHOR}</dc:creator>
    <dc:language>ja</dc:language>
    <meta property="dcterms:modified">2026-10-06T00:00:00Z</meta>
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


def write_epub(chapters):
    # A fixed timestamp keeps the archive's bytes the same from one build to the next.
    def add(archive, name, text, compress=zipfile.ZIP_DEFLATED):
        info = zipfile.ZipInfo(name, date_time=(2026, 10, 6, 0, 0, 0))
        archive.writestr(info, text, compress_type=compress)

    with zipfile.ZipFile(OUTPUT, "w") as archive:
        add(archive, "mimetype", "application/epub+zip", zipfile.ZIP_STORED)
        add(archive, "META-INF/container.xml", CONTAINER)
        add(archive, "OEBPS/content.opf", content_opf(len(chapters)))
        add(archive, "OEBPS/nav.xhtml", nav_xhtml([title for title, _ in chapters]))
        for i, (title, paragraphs) in enumerate(chapters):
            add(archive, f"OEBPS/chapter{i + 1}.xhtml", chapter_xhtml(title, paragraphs))


if __name__ == "__main__":
    main(sys.argv[1])
