"""Builds toshishun.epub, toshishun.en.epub, and toshishun.m4a: the opening of Akutagawa Ryūnosuke's 杜子春, its English translation, and a clip of a reading.

Usage: python3 fixtures/build-toshishun.py <43015_17432.html> <tu-tzuchun.json> <toshisyun_01_akutagawa.mp3>
The inputs are Aozora Bunko's Shift_JIS file https://www.aozora.gr.jp/cards/000879/files/43015_17432.html,
the MediaWiki parse API's JSON for https://en.wikisource.org/wiki/Eminent_Authors_of_Contemporary_Japan/Volume_1/Tu_Tzuchun,
and LibriVox's https://archive.org/download/toshisyun_um_librivox/toshisyun_01_akutagawa.mp3.
Both books hold the story's first three sections and a last chapter of credits.
Ruby readings are dropped, since the reader shows only the base text.
"""

import html
import json
import re
import subprocess
import sys
from pathlib import Path

from epub_writer import write_epub

FIXTURES = Path(__file__).parent
SECTION_COUNT = 3

# The clip runs from the pause after the reader announces section 一 to the pause after the sentence ending かすかに白く浮んでいるのです。
CLIP_START = "18.5"
CLIP_DURATION = "65.1"

ENGLISH_CREDITS = [
    "Translated by Eric S. Bell and Yoshinobu Tada. From Eminent Authors of Contemporary Japan, Volume 1, edited by Eric S. Bell and Eiji Ukai, published by Kaitakusha, Tokyo, in 1930.",
    "Text from Wikisource: https://en.wikisource.org/wiki/Eminent_Authors_of_Contemporary_Japan/Volume_1/Tu_Tzuchun",
]


def main(japanese_path, english_path, audio_path):
    write_epub(FIXTURES / "toshishun.epub", japanese_metadata(), japanese_chapters(japanese_path))
    write_epub(FIXTURES / "toshishun.en.epub", english_metadata(), english_chapters(english_path))
    write_clip(audio_path, FIXTURES / "toshishun.m4a")


def japanese_metadata():
    return {
        "identifier": "urn:uuid:6c2f0d8e-4b7a-4e19-9d35-0a8b1f3c7e52",
        "title": "杜子春",
        "author": "芥川龍之介",
        "language": "ja",
        "toc_title": "目次",
    }


def english_metadata():
    return {
        "identifier": "urn:uuid:a4e81b07-2d6c-4f93-8b1e-5c9d0f7a3e26",
        "title": "Tu Tzuchun",
        "author": "Ryūnosuke Akutagawa",
        "language": "en",
        "toc_title": "Contents",
    }


def japanese_chapters(source_path):
    source = Path(source_path).read_bytes().decode("shift_jis")
    main_text = between(source, '<div class="main_text">', '<div class="bibliographical_information">')
    credits = between(source, '<div class="bibliographical_information">', '<div class="notation_notes">')
    sections = re.split(r'<div class="jisage_5"[^>]*><h4[^>]*>(.*?)</h4></div>', main_text)[1:]
    chapters = [(plain_text(sections[i]), lines_of(sections[i + 1])) for i in range(0, 2 * SECTION_COUNT, 2)]
    return chapters + [("底本・クレジット", lines_of(credits))]


def english_chapters(source_path):
    source = json.loads(Path(source_path).read_text(encoding="utf-8"))["parse"]["text"]
    source = re.sub(r"<style.*?</style>|<link [^>]*/>", "", source, flags=re.S)
    source = re.sub(r'<span><span class="pagenum.*?</span></span></span>', "", source, flags=re.S)
    source = re.sub(r'<span class="wst-tooltip[^"]*" title="([^"]*)">.*?</span>', sic_correction, source)
    heading = r'<div class="wst-center tiInherit">\s*<p><b><span class="wst-uppercase">Part</span> ([IVX]+)</b>\s*</p>\s*</div>'
    sections = re.split(heading, source)[1:]
    chapters = [(f"Part {sections[i]}", [p for block in paragraph_blocks(sections[i + 1]) for p in lines_of(block)]) for i in range(0, 2 * SECTION_COUNT, 2)]
    return chapters + [("Credits", ENGLISH_CREDITS)]


def sic_correction(match):
    """Replaces a word that Wikisource marks as a misprint with the reading it suggests, such as "[sic] 'gold that'"."""
    return html.escape(re.fullmatch(r"\[sic\] '(.*)'", html.unescape(match.group(1))).group(1))


def paragraph_blocks(markup):
    return re.findall(r"<p>(.*?)</p>", markup, re.S)


def between(text, start, end):
    return text[text.index(start) + len(start) : text.index(end)]


def lines_of(markup):
    lines = (plain_text(line) for line in re.split(r"<br\s*/>", markup))
    return [line for line in lines if line]


def plain_text(markup):
    markup = re.sub(r"<rp>.*?</rp>|<rt>.*?</rt>", "", markup)
    text = html.unescape(re.sub(r"<[^>]+>", "", markup)).replace("​", "")
    return " ".join(text.split())


def write_clip(audio_path, output):
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-ss", CLIP_START, "-t", CLIP_DURATION, "-i", audio_path,
            "-map", "0:a", "-map_metadata", "-1", "-ac", "1", "-ar", "22050", "-c:a", "aac", "-b:a", "20k",
            "-fflags", "+bitexact", "-flags:a", "+bitexact", str(output),
        ],
        check=True,
    )


if __name__ == "__main__":
    main(*sys.argv[1:])
