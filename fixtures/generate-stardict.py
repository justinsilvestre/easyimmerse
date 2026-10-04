#!/usr/bin/env python3
"""Builds the StarDict fixtures from the definitions below.

- sample-stardict/: typed fields (m, t, h, r, g, W, y, x), a dictzip data file,
  synonyms, an idx record sharing another's data, a stylesheet, and an image under res/.
- sample-stardict-sametypesequence/: version 3.0.0 with sametypesequence=tm,
  64-bit offsets, a gzipped index, and an uncompressed data file.
- sample-stardict.tar.gz: sample-stardict/ packed as a gzip-compressed tar archive.

Run it from anywhere with `python3 fixtures/generate-stardict.py`. The output is deterministic.
"""

import gzip
import io
import shutil
import struct
import tarfile
import zlib
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent
DICTZIP_CHUNK_LENGTH = 64


def text_field(kind, value):
    return kind + value.encode() + b"\0"


def binary_field(kind, data):
    return kind + struct.pack(">I", len(data)) + data


SAMPLE_ENTRIES = [
    (["Apple", "apple"], text_field(b"m", "A round fruit.\nIt grows on trees.")),
    (
        ["cat"],
        text_field(b"t", "kæt")
        + text_field(b"h", '<b>cat</b>: a small animal. <img src="cat.png">')
        + text_field(b"r", "img:cat.png"),
    ),
    (
        ["dog"],
        text_field(b"g", '<b>dog</b> <span foreground="gray">n.</span> a loyal animal')
        + binary_field(b"W", b"RIFF\0\0\0\0WAVE"),
    ),
    (["猫"], text_field(b"y", "ねこ") + text_field(b"x", "<k>猫</k> <dtrn>cat</dtrn>")),
]
SAMPLE_SYNONYMS = [("apples", "apple"), ("kitty", "cat"), ("ネコ", "猫")]

SAMETYPE_ENTRIES = [
    (["hello"], "həˈləʊ".encode() + b"\0" + "a greeting".encode()),
    (["world"], "wɜːld".encode() + b"\0" + "the earth".encode()),
]


def stardict_order(word):
    """Sorts as StarDict does: ASCII letters folded first, then plain bytes to break ties."""
    encoded = word.encode()
    return (encoded.lower(), encoded)


def build_index(entries, offset_format):
    data = b""
    records = []
    for headwords, entry_data in entries:
        for headword in headwords:
            records.append((headword, len(data), len(entry_data)))
        data += entry_data
    records.sort(key=lambda record: stardict_order(record[0]))
    index = b"".join(
        word.encode() + b"\0" + struct.pack(offset_format, offset, size)
        for word, offset, size in records
    )
    positions = {word: position for position, (word, _, _) in enumerate(records)}
    return data, index, positions


def build_synonyms(synonyms, positions):
    ordered = sorted(synonyms, key=lambda synonym: stardict_order(synonym[0]))
    return b"".join(
        word.encode() + b"\0" + struct.pack(">I", positions[target])
        for word, target in ordered
    )


def dictzip(data):
    """Compresses data as dictzip: gzip with a chunk table in the RA extra field."""
    chunks = [
        data[start : start + DICTZIP_CHUNK_LENGTH]
        for start in range(0, len(data), DICTZIP_CHUNK_LENGTH)
    ]
    compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
    compressed = []
    for position, chunk in enumerate(chunks):
        is_last = position == len(chunks) - 1
        flush_mode = zlib.Z_FINISH if is_last else zlib.Z_FULL_FLUSH
        compressed.append(compressor.compress(chunk) + compressor.flush(flush_mode))
    payload = struct.pack("<HHH", 1, DICTZIP_CHUNK_LENGTH, len(chunks))
    payload += b"".join(struct.pack("<H", len(chunk)) for chunk in compressed)
    extra = b"RA" + struct.pack("<H", len(payload)) + payload
    header = b"\x1f\x8b\x08\x04" + struct.pack("<I", 0) + b"\x02\x03"
    header += struct.pack("<H", len(extra)) + extra
    trailer = struct.pack("<II", zlib.crc32(data), len(data))
    return header + b"".join(compressed) + trailer


def tiny_png():
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    pixels = zlib.compress(b"\x00\xe0\x80\x30")
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", pixels) + chunk(b"IEND", b"")


def ifo(lines):
    return ("StarDict's dict ifo file\n" + "".join(f"{key}={value}\n" for key, value in lines)).encode()


def write_files(directory, files):
    shutil.rmtree(directory, ignore_errors=True)
    for name, content in files.items():
        path = directory / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)


def write_sample():
    data, index, positions = build_index(SAMPLE_ENTRIES, ">II")
    synonyms = build_synonyms(SAMPLE_SYNONYMS, positions)
    metadata = [
        ("version", "2.4.2"),
        ("wordcount", len(positions)),
        ("synwordcount", len(SAMPLE_SYNONYMS)),
        ("idxfilesize", len(index)),
        ("bookname", "Sample StarDict Dictionary"),
        ("author", "easyImmerse"),
        ("website", "https://example.com/sample-stardict"),
        ("date", "2026.10.05"),
        ("description", "A tiny dictionary for tests.<br>It covers several field types."),
        ("lang", "en-ja"),
    ]
    write_files(
        FIXTURES / "sample-stardict",
        {
            "sample.ifo": ifo(metadata),
            "sample.idx": index,
            "sample.dict.dz": dictzip(data),
            "sample.syn": synonyms,
            "sample.css": b"b { color: teal; }\n",
            "res/cat.png": tiny_png(),
        },
    )


def write_sametype_sample():
    data, index, positions = build_index(SAMETYPE_ENTRIES, ">QI")
    metadata = [
        ("version", "3.0.0"),
        ("wordcount", len(positions)),
        ("idxfilesize", len(index)),
        ("idxoffsetbits", 64),
        ("sametypesequence", "tm"),
        ("bookname", "Sample Phonetic Dictionary"),
    ]
    write_files(
        FIXTURES / "sample-stardict-sametypesequence",
        {
            "phonetic.ifo": ifo(metadata),
            "phonetic.idx.gz": gzip.compress(index, mtime=0),
            "phonetic.dict": data,
        },
    )


def write_sample_archive():
    def normalize(member):
        member.uid = member.gid = 0
        member.uname = member.gname = ""
        member.mtime = 0
        member.mode = 0o755 if member.isdir() else 0o644
        return member

    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        archive.add(FIXTURES / "sample-stardict", arcname="sample-stardict", filter=normalize)
    archive_path = FIXTURES / "sample-stardict.tar.gz"
    archive_path.write_bytes(gzip.compress(buffer.getvalue(), mtime=0))


write_sample()
write_sametype_sample()
write_sample_archive()
