#!/usr/bin/env python3
"""Writes the MDict fixtures: a version 2.0 dictionary in sample-mdict/ and a version 1.2 dictionary in sample-mdict-v1/.

The layout follows the MDict format description published with writemdict (MIT licence).
Only the Python standard library is used. Run from the repository root: python3 fixtures/generate-mdict.py
"""

import struct
import zlib
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent
NO_COMPRESSION = 0
ZLIB = 2

STYLESHEET = "1\r\n<b>\r\n</b>\r\n2\r\n<i>\r\n</i>\r\n"

SAMPLE_ENTRIES = [
    ("cat", '`1`cat`2`a small domesticated feline. See also <a href="entry://dog">dog</a>.<br><img src="cat.png">'),
    ("dog", '`1`dog`2`a domesticated canine. <a href="sound://dog.mp3">Listen</a>'),
    ("kitty", "@@@LINK=cat"),
    ("猫", "@@@LINK=cat"),
]

LEGACY_ENTRIES = [
    ("apple", "a round fruit"),
    ("pear", "a sweet fruit"),
]


def main():
    sample = FIXTURES / "sample-mdict"
    sample.mkdir(exist_ok=True)
    (sample / "sample.mdx").write_bytes(sample_mdx())
    (sample / "sample.mdd").write_bytes(sample_mdd())
    (sample / "sample.css").write_text(".cat b { color: #a33; }\n")
    legacy = FIXTURES / "sample-mdict-v1"
    legacy.mkdir(exist_ok=True)
    (legacy / "legacy.mdx").write_bytes(legacy_mdx())


def sample_mdx():
    element = dictionary_element(
        version="2.0",
        Encoding="UTF-8",
        Format="Html",
        Title="Sample MDict",
        Description="<p>A tiny dictionary for tests.</p>",
        CreationDate="2026-10-05",
        StyleSheet=STYLESHEET,
    )
    records = [(key, entry_record(text)) for key, text in SAMPLE_ENTRIES]
    return write_mdict(element, records, version=2, key_encoding="utf-8", record_compression=ZLIB)


def sample_mdd():
    element = '<Library_Data GeneratedByEngineVersion="2.0" RequiredEngineVersion="2.0" Encrypted="0" Encoding="" Format=""/>'
    records = [("\\cat.png", tiny_png())]
    return write_mdict(element, records, version=2, key_encoding="utf-16-le", record_compression=ZLIB)


def legacy_mdx():
    element = dictionary_element(version="1.2", Encoding="UTF-8", Format="Text", Title="Legacy Sample")
    records = [(key, entry_record(text)) for key, text in LEGACY_ENTRIES]
    return write_mdict(element, records, version=1, key_encoding="utf-8", record_compression=NO_COMPRESSION)


def dictionary_element(version, **attributes):
    pairs = [("GeneratedByEngineVersion", version), ("RequiredEngineVersion", version), ("Encrypted", "No")]
    pairs += list(attributes.items())
    text = " ".join(f'{name}="{escape_attribute(value)}"' for name, value in pairs)
    return f"<Dictionary {text}/>"


def escape_attribute(value):
    """Escapes markup the way MdxBuilder does, leaving line breaks raw."""
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def entry_record(text):
    return (text + "\r\n").encode("utf-8") + b"\0"


def write_mdict(element, records, version, key_encoding, record_compression):
    """Writes a file with one key block and one record block."""
    width = 8 if version == 2 else 4
    unit = 2 if key_encoding == "utf-16-le" else 1
    keys = [key.encode(key_encoding) for key, _ in records]
    record_data = b""
    key_block = b""
    for key, (_, record) in zip(keys, records):
        key_block += number(len(record_data), width) + key + b"\0" * unit
        record_data += record
    stored_keys = block(key_block, ZLIB)
    key_info = (
        number(len(keys), width)
        + sized_key(keys[0], version, unit)
        + sized_key(keys[-1], version, unit)
        + number(len(stored_keys), width)
        + number(len(key_block), width)
    )
    return (
        header(element)
        + key_section(key_info, stored_keys, len(keys), version)
        + record_section(record_data, len(records), width, record_compression)
    )


def key_section(key_info, stored_keys, entry_count, version):
    if version == 2:
        stored_info = block(key_info, ZLIB)
        fields = [1, entry_count, len(key_info), len(stored_info), len(stored_keys)]
        summary = b"".join(number(field, 8) for field in fields)
        summary += struct.pack(">I", zlib.adler32(summary))
    else:
        stored_info = key_info
        fields = [1, entry_count, len(stored_info), len(stored_keys)]
        summary = b"".join(number(field, 4) for field in fields)
    return summary + stored_info + stored_keys


def record_section(record_data, entry_count, width, compression):
    stored = block(record_data, compression)
    index = number(len(stored), width) + number(len(record_data), width)
    fields = [1, entry_count, len(index), len(stored)]
    return b"".join(number(field, width) for field in fields) + index + stored


def sized_key(key, version, unit):
    """Version 2.0 writes a 2-byte length in code units and a NUL; version 1.2 writes a 1-byte length."""
    units = len(key) // unit
    if version == 2:
        return number(units, 2) + key + b"\0" * unit
    return number(units, 1) + key


def header(element):
    text = (element + "\r\n\0").encode("utf-16-le")
    return struct.pack(">I", len(text)) + text + struct.pack("<I", zlib.adler32(text))


def block(data, method):
    payload = zlib.compress(data) if method == ZLIB else data
    return bytes([method, 0, 0, 0]) + struct.pack(">I", zlib.adler32(data)) + payload


def number(value, width):
    return value.to_bytes(width, "big")


def tiny_png():
    """A 1×1 red PNG."""

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header_data = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    pixels = zlib.compress(b"\x00\xff\x00\x00")
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header_data) + chunk(b"IDAT", pixels) + chunk(b"IEND", b"")


if __name__ == "__main__":
    main()
