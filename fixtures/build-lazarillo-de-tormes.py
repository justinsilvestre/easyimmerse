"""Builds the Lazarillo de Tormes fixtures: a short Spanish EPUB, its English translation, and a clip of a reading.

Usage: python3 fixtures/build-lazarillo-de-tormes.py <pg320.txt> <pg53489.txt> <Lazarillo_de_Tormes_1_anonimo.mp3>

The inputs are Project Gutenberg eBook #320 (the Spanish text), Project Gutenberg eBook #53489
(Clements R. Markham's English translation of 1908), and the first file of LibriVox's Spanish reading.
Both books hold the same passages: the prologue, the opening of the first tratado up to the blind man's arrival,
and the opening of the second tratado up to the priest's words about the Pope.
"""

import re
import subprocess
import sys
from pathlib import Path

from epub_writer import write_epub

FIXTURES = Path(__file__).parent

SPANISH_METADATA = {
    "identifier": "urn:uuid:65534358-da7c-4fac-a197-408b84869aed",
    "title": "La vida de Lazarillo de Tormes",
    "author": "Anónimo",
    "language": "es",
    "toc_title": "Índice",
}
ENGLISH_METADATA = {
    "identifier": "urn:uuid:194d8cbc-9cad-4c46-8070-a3be84376fbf",
    "title": "The Life of Lazarillo de Tormes",
    "author": "Anonymous, translated by Clements R. Markham",
    "language": "en",
    "toc_title": "Contents",
}

# The clip runs from just before the reader announces the prologue to the pause after "¿Quién piensa ... el vivir?".
CLIP_START = "23.2"
CLIP_END = "94.9"


def main(spanish_path, english_path, audio_path):
    spanish = gutenberg_body(Path(spanish_path))
    english = gutenberg_body(Path(english_path))
    write_epub(FIXTURES / "lazarillo-de-tormes.epub", SPANISH_METADATA, spanish_chapters(spanish))
    write_epub(FIXTURES / "lazarillo-de-tormes.en.epub", ENGLISH_METADATA, english_chapters(english))
    write_clip(audio_path, FIXTURES / "lazarillo-de-tormes.m4a")


def gutenberg_body(path):
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    start = text.index("\n", text.index("*** START OF"))
    return text[start : text.index("*** END OF")]


def spanish_chapters(text):
    # Braces mark the Alcalá edition's additions. Their text stays, as in the transcription that LibriVox read; only the braces go.
    text = text.replace("{", "").replace("}", "")
    chapters = [
        ("Prólogo", blocks_between(text, "\nPrólogo\n", "\nTratado Primero\n")),
        ("Tratado primero: Cuenta Lázaro su vida, y cuyo hijo fue", blocks_after(text, "y cuyo hijo fue\n")[:7]),
        (
            "Tratado segundo: Cómo Lázaro se asentó con un clérigo, y de las cosas que con él pasó",
            blocks_after(text, "que con él pasó\n")[:4],
        ),
    ]
    return [(title, [collapse(block) for block in blocks]) for title, blocks in chapters]


def english_chapters(text):
    # The table of contents repeats the chapter headings, so the search starts at the prologue.
    text = text[text.index("\nPROLOGUE\n\n\n") :]
    second_master = english_paragraphs(blocks_after(text, "THAT\nHAPPENED TO HIM.\n"))[:3]
    # The third paragraph runs on past the end of the Spanish chapter's last paragraph.
    second_master[-1] = second_master[-1][: second_master[-1].index("the Pope.”") + len("the Pope.”")]
    return [
        ("Prologue", english_paragraphs(blocks_between(text, "\nPROLOGUE\n", "\nI\n"))),
        (
            "I: Lazaro relates the way of his birth and tells whose son he is",
            english_paragraphs(blocks_between(text, "WHOSE SON HE IS\n", "[Illustration")),
        ),
        ("Second master: How Lazaro took service with a clergyman, and of the things that happened to him", second_master),
    ]


def english_paragraphs(blocks):
    """Drops footnotes, sidenotes, footnote markers, and the underscores that mark italics."""
    paragraphs = []
    for block in blocks:
        text = re.sub(r"\[Sidenote:[^\]]*\]", " ", block)
        text = re.sub(r"\[\d+\]|_", "", text)
        text = collapse(text)
        if text and not re.match(r"\s*\[\d+\]", block):
            paragraphs.append(text)
    return paragraphs


def blocks_between(text, start, end):
    start_index = text.index(start) + len(start)
    return to_blocks(text[start_index : text.index(end, start_index)])


def blocks_after(text, start):
    return to_blocks(text[text.index(start) + len(start) :])


def to_blocks(text):
    """Splits text at blank lines, keeping each block's own whitespace so that indented footnotes can be recognized."""
    return [block for block in re.split(r"\n\s*\n", text) if block.strip()]


def collapse(text):
    return re.sub(r"\s+", " ", text).strip()


def write_clip(audio_path, output):
    """Cuts the clip into mono AAC at a low bit rate, with flags that make the output the same on every run."""
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", CLIP_START, "-to", CLIP_END, "-i", audio_path,
         "-map", "0:a", "-map_metadata", "-1", "-ac", "1", "-ar", "22050", "-c:a", "aac", "-b:a", "20k",
         "-fflags", "+bitexact", "-flags:a", "+bitexact", str(output)],
        check=True,
    )


if __name__ == "__main__":
    main(*sys.argv[1:])
