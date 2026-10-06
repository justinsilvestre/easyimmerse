# Fixtures

Small sample inputs shared by tests across the repository. Every file stays under 200 KB. The package `@easyimmerse/fixtures` exposes `fixturePath`, `readFixtureText`, and `readFixtureBytes` from `index.ts` so TypeScript tests can locate and read these files without hard-coded paths.

## sample.srt

Four SubRip cues between 0 and 5 seconds, written with CRLF line endings on purpose. Cue 2 spans two lines of text and cue 3 contains `<i>` inline markup. The text pairs with the dictionary fixture, so it mentions a cat, a dog, eating, and quiet.

Hand-written. To regenerate, edit the file with an editor that preserves CRLF, or run:

```sh
printf '1\r\n00:00:00,500 --> 00:00:01,500\r\nThe cat is sleeping.\r\n\r\n2\r\n00:00:01,750 --> 00:00:03,000\r\nThe dog wants to eat.\r\nIt is hungry.\r\n\r\n3\r\n00:00:03,250 --> 00:00:04,000\r\n<i>Everything</i> is quiet.\r\n\r\n4\r\n00:00:04,250 --> 00:00:05,000\r\nGood night.\r\n' > fixtures/sample.srt
```

## sample.vtt

The same four cues as `sample.srt` in WebVTT form, with LF line endings: a `WEBVTT` header, a `NOTE` block, a cue identifier on every cue, and `line:90% align:center` settings on cue 3. Keep it in sync with `sample.srt` and with the subtitle track inside the video fixture.

Hand-written. Edit directly.

## sample-epub/ and sample.epub

An unzipped EPUB 3 source tree and its packaged form. The book is titled "Sample Book", is in English, and has two chapters plus a navigation document. Chapter two contains an inline `<span>` so text extraction has to merge inline elements.

To regenerate `sample.epub` after editing the tree (the `mimetype` entry must come first and be stored uncompressed):

```sh
cd fixtures/sample-epub && rm -f ../sample.epub && zip -X0 ../sample.epub mimetype && zip -Xr9D ../sample.epub META-INF OEBPS
```

## die-verwandlung.txt.gz and die-verwandlung.epub

Franz Kafka's "Die Verwandlung" (1915, in the public domain), a whole novella in German for exercising the reader with a realistic book: long chapters, many pages, and words to look up. The text comes from Project Gutenberg eBook #22367, with Project Gutenberg's header, footer, and license removed.

Both files are compressed so that the book's text does not appear in diffs. Their unpacked forms, `die-verwandlung.txt` and `die-verwandlung-epub/`, are ignored by Git.

- `die-verwandlung.txt.gz` holds the plain-text layout: lines hard-wrapped at about 70 characters, paragraphs separated by blank lines, `--` for dashes, and the parts headed `I.`, `II.`, and `III.`. The plain-text parser reads it as one untitled chapter. The Storybook and Vitest configs of `packages/ui` call `unpackFixtures` from `unpackFixtures.ts`, which writes every `.gz` file in this folder out as its uncompressed sibling, so `die-verwandlung.txt` is current whenever stories or tests import it. Run `node fixtures/unpackFixtures.ts` to unpack it by hand.
- `die-verwandlung.epub` is an EPUB 3 book with one XHTML file per part, the paragraphs unwrapped, and the dashes written as `–`. Its metadata gives the title, the author, and the language `de`.

To change the plain text, edit `die-verwandlung.txt` and compress it again (`-n` leaves out the file name and timestamp, so the same text always gives the same bytes):

```sh
cd fixtures && gzip -9nc die-verwandlung.txt > die-verwandlung.txt.gz
```

To change the EPUB, unzip it into its tree:

```sh
cd fixtures && unzip -o die-verwandlung.epub -d die-verwandlung-epub
```

Then edit the tree and package it again (the `mimetype` entry must come first and be stored uncompressed):

```sh
cd fixtures/die-verwandlung-epub && rm -f ../die-verwandlung.epub && zip -X0 ../die-verwandlung.epub mimetype && zip -Xr9D ../die-verwandlung.epub META-INF OEBPS
```

## sample-yomitan/ and sample-yomitan.zip

A Yomitan dictionary in format version 3. It holds five term entries: 猫 (cat), 犬 (dog), 食べる (to eat, word class `v1`), 本 (book, with structured content and an image), and 食べた, which points to 食べる as an inflected form. It also has a tag bank, frequency and pitch-accent rows, a kanji entry with its own metadata, a stylesheet, and the image under `images/`. The sample subtitles mention the same words.

Hand-written. To regenerate `sample-yomitan.zip` after editing the tree, run `fixtures/build-sample-yomitan.sh`, which puts `index.json` first in the archive.

## sample-csv/

Word lists in the shapes that people export from other tools, one file per case:

- `anki-export.txt`: an Anki note export, tab-separated, with `#` header lines that name the separator, the deck and tag columns, the title, and the languages. Definitions contain HTML.
- `excel-semicolon.csv`: a spreadsheet export with a byte order mark, semicolons, CRLF line endings, a header row, and a quoted field that spans two lines.
- `frequency-words.txt`: a frequency list of words and counts separated by spaces.
- `jmdict-style.csv`: term, reading, and definition columns without a header, with a term that has two readings and a reading shared by two definitions.
- `shift-jis.csv`: Japanese text in the Shift_JIS encoding.
- `tabfile.txt`: the tabfile format that StarDict's tools convert from, with `##` metadata lines, alternative headwords separated by `|`, and escaped line breaks.
- `unicode-text.txt`: UTF-16 text with a byte order mark, the encoding of Excel's "Unicode text" export.

Hand-written. The files keep their line endings and encodings byte for byte, which `.gitattributes` protects. Edit them only with an editor that preserves both.

## sample-stardict/, sample-stardict-sametypesequence/, sample-stardict.tar.gz and sample-stardict.tar.bz2

StarDict dictionaries generated by `generate-stardict.py`. Never edit them by hand; change the script and run `python3 fixtures/generate-stardict.py`, whose output is deterministic.

- `sample-stardict/` uses every common field type (plain text, phonetic transcription, HTML, resource lists, Pango markup, WAV audio, kana readings, and XDXF). It has a dictzip-compressed data file, synonyms, two index records that share one definition, a stylesheet, and an image under `res/`.
- `sample-stardict-sametypesequence/` is a version 3.0.0 dictionary with a fixed field sequence, 64-bit offsets, a gzip-compressed index, and an uncompressed data file. Its media, a sound and an image, are packed into a resource database (`res.rifo`, `res.ridx`, and a dictzip-compressed `res.rdic.dz`) rather than a `res/` directory.
- `sample-stardict.tar.gz` is `sample-stardict/` packed as a gzip-compressed tar archive.
- `sample-stardict.tar.bz2` is the same tar archive compressed with bzip2.

## sample-mdict/ and sample-mdict-v1/

MDict dictionaries generated by `generate-mdict.py`. Never edit them by hand; change the script and run `python3 fixtures/generate-mdict.py`.

- `sample-mdict/` is a version 2.0 dictionary. `sample.mdx` holds HTML entries that use the dictionary's numbered style markers, link to other entries, play a sound, and show an image; `kitty` and `猫` redirect to `cat`. `sample.mdd` holds the image and the sound, and `sample.css` is the stylesheet that sits beside the dictionary.
- `sample-mdict-v1/legacy.mdx` is a version 1.2 dictionary with two plain-text entries.

## Media fixtures

Generated by `generate-media.sh` (`mise run fixtures:media`). Never edit them by hand; change the script and regenerate.

- `sample.mp4`: five seconds of the ffmpeg test pattern (320x180, H.264) with a 440 Hz sine tone (mono AAC) and `sample.srt` embedded as a `mov_text` subtitle track tagged `eng`.
- `sample.mkv`: the same content with the subtitle track stored as SubRip text, for Matroska metadata tests.
- `sample.mp3`: three seconds of a 440 Hz sine tone, mono, 64 kbps.

## Conversion fixtures

Generated by `generate-media.sh` alongside the media fixtures above. They let tests convert a file and compare the output with the source exactly: every video frame shows its own index, and the audio reveals which second a position lies in and where that second starts.

The script needs an ffmpeg build with libx264, libx265, libmp3lame, and the native `aac`, `vorbis`, `flac`, and `mpeg4` encoders, which every full build has. Every fixture is reproducible byte for byte on any platform with the same ffmpeg version; none depends on macOS. The output flags `+bitexact` keep the containers free of random identifiers.

### Frame index

Every frame is 256x144 and shows its zero-based frame index as 16 full-height columns, each 16 pixels wide. Column `i` (counting from the left, starting at 0) holds bit `i` of the index, so the least significant bit is on the left. A set bit is white (luma 235), a clear bit is black (luma 16), and chroma is neutral (128).

To read a frame, decode it to grayscale, take any row, and sample the center of each column, treating values of 128 or more as set. Decoding with `-pix_fmt gray` maps the luma range to 0–255, which the same threshold handles. The frame index divided by the frame rate is the frame's source timestamp.

### Audio pattern

Every audio track carries the same signal in each channel. At time `t` seconds:

- During the first 2 ms of each second (`t mod 1 < 0.00199`), the sample is a click: a constant 0.9 of full scale.
- Otherwise it is a sine tone at amplitude 0.25 with frequency `base + 20 * floor(t)` Hz.

The frequency identifies the second, and the click marks its exact start. The base is 220 Hz unless noted below, so second 0 plays 220 Hz, second 1 plays 240 Hz, and so on. The tone's phase restarts at each step, which the click hides.

Lossy formats without an edit list start with the encoder's priming samples, so the first click arrives late by that many samples: 1024 at 48 kHz for ADTS AAC and AAC in MPEG-TS, 1105 for MP3 in AVI. Decoders apply the edit lists in MP4 and the gapless metadata in raw MP3, so those start on time.

### Video files

All are 10 seconds long with regular keyframes every 2 seconds (keyframes at 0, 2, 4, 6, and 8 s) and scene-cut detection off, so a conversion into segments of 2 seconds or more lines up with them. The H.264 and HEVC streams use B-frames; the MPEG-4 part 2 streams do not. Audio is stereo at 48 kHz.

| File | Container | Video | Frame rate, GOP | Audio | Duration | Purpose |
| --- | --- | --- | --- | --- | --- | --- |
| `conversion-h264-aac.mp4` | MP4, `faststart` | H.264 Main, level 1.2, yuv420p, `avc1` | 25 fps, 50 frames | AAC LC, 48 kbps | 10.000 s | Plays directly on every engine |
| `conversion-h264-aac.mkv` | Matroska | H.264 Main, level 1.2, yuv420p | 24 fps, 48 frames | two AAC LC tracks, 48 kbps each | 10.021 s | Track choice and Matroska timing |
| `conversion-mpeg4-vorbis.mkv` | Matroska | MPEG-4 part 2 Simple Profile, yuv420p | 25 fps, 50 frames | Vorbis, about 48 kbps | 10.021 s | Both tracks must be transcoded |
| `conversion-hevc-aac.mp4` | MP4, `faststart` | HEVC Main, level 2, yuv420p, `hvc1` | 25 fps, 50 frames | AAC LC, 48 kbps | 10.000 s | Video copied with the `hvc1` tag |
| `conversion-interlaced-h264.mkv` | Matroska | H.264 Main, level 2.1, yuv420p, interlaced, field order `tt` | 25 fps, 50 frames | AAC LC, 48 kbps | 10.021 s | Must be deinterlaced |
| `conversion-h264-aac.ts` | MPEG-TS | H.264 Main, level 1.2, yuv420p | 25 fps, 50 frames | AAC LC (ADTS), 48 kbps | 10.021 s | Container that ffprobe reads but browsers do not play |
| `conversion-mpeg4-mp3.avi` | AVI | MPEG-4 part 2 Simple Profile, yuv420p, `FMP4` | 25 fps, 50 frames | MP3, 48 kbps | 10.040 s | Container that ffprobe reads but browsers do not play |

Notes on individual files:

- `conversion-h264-aac.mkv` has four streams. Stream 1 is AAC tagged `jpn` with the title "Japanese" and the default flag, using the 220 Hz base. Stream 2 is AAC tagged `eng` with the title "English", not default, using a 660 Hz base so a test can tell the tracks apart. Stream 3 is `sample.srt` as SubRip, tagged `eng`. Matroska stores timestamps in milliseconds, so at 24 fps the video packets advance by 42 and 41 ms in turn (0, 42, 83, 125, …).
- `conversion-interlaced-h264.mkv` shows the same picture in both fields of each frame, so a deinterlaced frame still decodes to its index. The frames are flagged interlaced and top field first. The video is encoded into a temporary MPEG-TS file and then remuxed, because the Matroska muxer labels top-field-first encoder output as field order `tb` instead of `tt`.
- `conversion-h264-aac.ts` starts its timestamps at 1.48 s, as MPEG-TS muxers do by default.
- In `conversion-mpeg4-vorbis.mkv` and the `.ogg` file, Vorbis comes from ffmpeg's experimental native encoder, since libvorbis is not in every build.

### Audio-only files

All are stereo and use the 220 Hz base.

| File | Format | Codec | Sample rate | Bit rate | Duration |
| --- | --- | --- | --- | --- | --- |
| `conversion-tone.mp3` | raw MP3 | MP3 (libmp3lame) | 48 kHz | 64 kbps | 8.000 s |
| `conversion-tone.aac` | ADTS | AAC LC | 48 kHz | 64 kbps | 8 s of audio; ffprobe estimates 8.175 s |
| `conversion-tone.ogg` | Ogg | Vorbis | 48 kHz | about 64 kbps | 8.000 s |
| `conversion-tone.flac` | FLAC | FLAC, 16-bit | 16 kHz | lossless | 8.000 s |
| `conversion-tone.wav` | WAV | PCM signed 16-bit little-endian, mono | 16 kHz | 256 kbps | 6.000 s |

The FLAC and WAV files use 16 kHz to keep them small; at that rate the 2 ms click spans 32 samples. The WAV file is also mono and only 6 seconds long for the same reason.
