"""Builds `AddAlignmentRequest` bodies for the sample books that the development seed adds.

Usage:
  python3 fixtures/build-sample-alignments.py sentences <book.epub>
  python3 fixtures/build-sample-alignments.py audio <book.epub> <audio> <output.json>
  python3 fixtures/build-sample-alignments.py translation <book.epub> <translation.epub> <links.txt> <output.json>

`sentences` prints every sentence of a book with its id, `<chapter>.<paragraph>.<sentence>`, counting from zero.

`audio` transcribes the audio with faster-whisper, matches the transcript's characters with the book's,
and writes one segment per sentence that the audio reads, timed from its first word to its last.
It needs `faster-whisper` installed in the Python that runs it.

`translation` reads a links file with one link per line: the ids of the book's sentences,
then `=`, then the ids of the translation's sentences, for example `0.1.0 0.1.1 = 0.2.0`.
Either side may be empty. Lines starting with `#` are comments.

Spans address paragraphs as the app's EPUB parser produces them, in UTF-16 code units,
which holds for books written by `epub_writer.py`: plain text in each `<p>`, already collapsed.
"""

import difflib
import html
import json
import re
import subprocess
import sys
import zipfile

# A full stop after a lone capital letter ends an initial, as in "Eric S. Bell", rather than a sentence.
SENTENCE_END = re.compile(r"""(?:(?:(?<!\b[A-Z])\.|[!?。！？…])+[”’"'»」』）)\]]*)+""")


def main(command, *args):
    commands = {"sentences": print_sentences, "audio": build_audio, "translation": build_translation}
    commands[command](*args)


def print_sentences(book_path):
    for sentence in book_sentences(book_path):
        print(f"{sentence['id']}\t{sentence['quote']}")


def build_audio(book_path, audio_path, output_path):
    sentences = book_sentences(book_path)
    words = transcribe(audio_path, book_language(book_path))
    segments = []
    for sentence, times in zip(sentences, sentence_times(sentences, words)):
        if times is None:
            continue
        start, end = times
        if segments and start < segments[-1]["end_ms"]:
            start = segments[-1]["end_ms"]
        segments.append({"span": span_of(sentence), "start_ms": start, "end_ms": max(end, start + 1)})
    write_request(output_path, {"kind": "audio", "audio_media_file_id": "audio", "segments": segments})


def build_translation(book_path, translation_path, links_path, output_path):
    book = {s["id"]: s for s in book_sentences(book_path)}
    translation = {s["id"]: s for s in book_sentences(translation_path)}
    links = []
    for line in open(links_path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        left, right = line.split("=")
        links.append({
            "spans": [span_of(book[id]) for id in left.split()],
            "translation_spans": [span_of(translation[id]) for id in right.split()],
        })
    write_request(output_path, {"kind": "translation", "translation_media_file_id": "translation", "links": links})


def write_request(output_path, content):
    with open(output_path, "w", encoding="utf-8") as output:
        json.dump({"provider": None, "content": content}, output, ensure_ascii=False, indent=2)
        output.write("\n")


def book_sentences(book_path):
    sentences = []
    for chapter_index, paragraphs in enumerate(book_chapters(book_path)):
        for paragraph_index, paragraph in enumerate(paragraphs):
            for sentence_index, (start, end) in enumerate(sentence_ranges(paragraph)):
                sentences.append({
                    "id": f"{chapter_index}.{paragraph_index}.{sentence_index}",
                    "chapter_index": chapter_index,
                    "paragraph_index": paragraph_index,
                    "paragraph": paragraph,
                    "start": start,
                    "end": end,
                    "quote": paragraph[start:end],
                })
    return sentences


def book_chapters(book_path):
    with zipfile.ZipFile(book_path) as archive:
        names = sorted(
            (n for n in archive.namelist() if re.fullmatch(r"OEBPS/chapter\d+\.xhtml", n)),
            key=lambda n: int(re.search(r"\d+", n).group()),
        )
        return [paragraphs_of(archive.read(n).decode("utf-8")) for n in names]


def book_language(book_path):
    with zipfile.ZipFile(book_path) as archive:
        opf = archive.read("OEBPS/content.opf").decode("utf-8")
    return re.search(r"<dc:language>(.*?)</dc:language>", opf).group(1)


def paragraphs_of(xhtml):
    return [html.unescape(p) for p in re.findall(r"<p>(.*?)</p>", xhtml, re.S)]


def sentence_ranges(paragraph):
    """Splits a paragraph after each sentence-ending mark and any closing quotes, leaving out the spaces between sentences."""
    ranges, start = [], 0
    for match in SENTENCE_END.finditer(paragraph):
        if continues_sentence(paragraph[match.end() :]):
            continue
        ranges.append((start, match.end()))
        start = len(paragraph) - len(paragraph[match.end() :].lstrip())
    if paragraph[start:].strip():
        ranges.append((start, start + len(paragraph[start:].rstrip())))
    return [(start, end) for start, end in ranges if end > start]


def continues_sentence(rest):
    """Tells whether a mark is inside a sentence: before a lower-case letter or a comma ("M. reciba", "¡Dios!, decía"),
    or directly before a capital letter, as inside an abbreviation such as "V.M.".
    """
    following = rest.lstrip()
    if not following:
        return False
    return following[0].islower() or following[0] in ",;:" or (following[0].isupper() and following == rest)


def span_of(sentence):
    paragraph = sentence["paragraph"]
    return {
        "chapter_index": sentence["chapter_index"],
        "paragraph_index": sentence["paragraph_index"],
        "start": utf16_length(paragraph[: sentence["start"]]),
        "end": utf16_length(paragraph[: sentence["end"]]),
        "quote": sentence["quote"],
    }


def utf16_length(text):
    return len(text.encode("utf-16-le")) // 2


def transcribe(audio_path, language):
    from faster_whisper import WhisperModel

    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(decode_audio(audio_path), language=language, word_timestamps=True)
    return [(word.word, round(word.start * 1000), round(word.end * 1000)) for s in segments for word in s.words]


def decode_audio(audio_path):
    """Decodes the audio to 16 kHz mono samples with ffmpeg, since faster-whisper's own decoder breaks with recent PyAV releases."""
    import numpy

    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", audio_path, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return numpy.frombuffer(pcm, dtype=numpy.float32)


def sentence_times(sentences, words):
    """Times each sentence by the words whose characters match or replace the sentence's, or None when fewer than half of its characters are heard."""
    book_text, book_owner = normalized_characters((s["quote"], i) for i, s in enumerate(sentences))
    heard_text, heard_owner = normalized_characters((w[0], i) for i, w in enumerate(words))
    matcher = difflib.SequenceMatcher(None, book_text, heard_text, autojunk=False)
    matched_words = [set() for _ in sentences]
    matched_counts = [0] * len(sentences)
    for tag, book_start, book_end, heard_start, heard_end in matcher.get_opcodes():
        if tag == "equal":
            for offset in range(book_end - book_start):
                matched_words[book_owner[book_start + offset]].add(heard_owner[heard_start + offset])
                matched_counts[book_owner[book_start + offset]] += 1
        elif tag == "replace":
            # Heard characters that differ from the book's, such as kana that the book writes in kanji,
            # still time the sentence whose characters they replace, spread evenly over the replaced run.
            for offset in range(heard_end - heard_start):
                owner = book_owner[book_start + offset * (book_end - book_start) // (heard_end - heard_start)]
                matched_words[owner].add(heard_owner[heard_start + offset])
    counts = [sum(1 for owner in book_owner if owner == i) for i in range(len(sentences))]
    times = []
    for i, word_indexes in enumerate(matched_words):
        if not word_indexes or matched_counts[i] * 2 < counts[i]:
            times.append(None)
        else:
            times.append((words[min(word_indexes)][1], words[max(word_indexes)][2]))
    return times


def normalized_characters(pieces):
    """Joins the letters and digits of each piece in lower case, with the index of the piece that each character came from."""
    text, owners = [], []
    for piece, owner in pieces:
        for character in piece.lower():
            if character.isalnum():
                text.append(character)
                owners.append(owner)
    return "".join(text), owners


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(*sys.argv[1:])
