# Alignment data

An *alignment* records how one document (an ebook or text file in a project) lines up with something else: the audio file that reads it aloud, or a second document that translates it. Alignments are produced by a provider (the easyImmerse cloud or an installed plugin), saved in the project's database, and read by the ebook reader to play matching audio, highlight the spoken text, and show translations beside the text.

The Rust types in `crates/core/src/alignment.rs` are the source of truth; this page explains the shape and the reasoning so providers and the reader agree on it.

## Addressing text

Documents have no ids inside them. A parsed `Document` is a list of chapters, each a list of paragraph strings, so a piece of text is addressed by position:

```
TextSpan { chapter_index, paragraph_index, start, end }
```

- `chapter_index` and `paragraph_index` count from zero within the parsed document.
- `start` and `end` are offsets into the paragraph string, counted in UTF-16 code units, exactly as JavaScript's `String` indexes them. `end` is exclusive. The reader already addresses words and reading locations this way (`ReaderLocation`, `TextSpan` in `wordAt.ts`), so no conversion is needed on the client. Rust code treats the offsets as opaque numbers; it does not slice paragraphs by them.
- A span never crosses a paragraph. Something that covers several paragraphs is a list of spans.
- A span addresses the paragraph as the parser produced it, before the reader's `unwrapHardLineBreaks`, which keeps offsets unchanged by design.

Because positions depend on the parse, an alignment is only valid for the document as the current parser produces it. If the parser changes how it splits paragraphs, saved alignments go stale. The reader tolerates this by clamping spans to the paragraphs that exist and ignoring spans that fall outside the text.

## Two kinds of alignment

Both kinds are variants of one `AlignmentContent` enum, tagged by `kind` in JSON.

### Audio

```
{ "kind": "audio",
  "audio_media_file_id": "<media file id>",
  "segments": [ { "span": TextSpan, "start_ms": u64, "end_ms": u64 }, ... ] }
```

Each `TimedSpan` says that `span` is heard between `start_ms` and `end_ms` of the audio file. Segments are sorted by their span's position in the document and by time; a provider usually emits one per sentence. Text with no segment (a chapter title, a footnote) is simply never highlighted. Times are milliseconds, as everywhere in the crates.

### Translation

```
{ "kind": "translation",
  "translation_media_file_id": "<media file id>",
  "links": [ { "spans": [TextSpan, ...], "translation_spans": [TextSpan, ...] }, ... ] }
```

Each `TranslationLink` pairs text of the document (`spans`) with the text of the translation document (`translation_spans`) that says the same thing. Either side may hold several spans, for a sentence that the translation splits in two or joins with the next, and either side may be empty for text the translation leaves out or adds. Links are sorted by the position of their first document span; links with no document span are sorted by their first translation span. Spans on each side are sorted and do not overlap.

The translation is itself a document in the project (an EPUB or text file), so both sides are addressed the same way and the reader can show either one alone.

## The record

```
Alignment { id, media_file_id, provider, created_at_ms, content }
```

- `media_file_id` is the document the alignment belongs to. Its counterpart (the audio file or the translation) is named inside `content`.
- `provider` names what produced it (a plugin name, or `cloud`), or is null for an alignment added from a file.
- A document can have several alignments, for example one with its audiobook and one with its translation. The reader uses the newest of each kind.

Alignments live in the `alignments` table in the project database, keyed by the document's media file id, with the counterpart's id in its own column so that removing either file removes the alignment. They are read and written through the API:

- `GET /projects/{id}/media/{media_id}/alignments` lists the document's alignments.
- `POST /projects/{id}/media/{media_id}/alignments` adds one from an `AddAlignmentRequest { provider, content }`.
- `DELETE /projects/{id}/media/{media_id}/alignments/{alignment_id}` removes one.

## Pairing a translation before it is aligned

A person can open a translation of a book before the two are aligned, to read either language on its own. That pairing is not an alignment: it is the `translation_media_file_id` of the document's media file record, set through `PUT /projects/{id}/media/{media_id}/translation-document`. Combining the two into a bilingual ebook asks a provider to produce a translation alignment between them.

## What a provider sees

The `alignment` plugin interface (`crates/plugin-api/wit/alignment.wit`) currently aligns an audio file with a transcript given as a list of strings and returns a timed-text track. Aligning a document with its audio, or two documents with each other, needs interfaces that take the parsed paragraphs and return the spans above. Those interfaces are not defined yet; when they are, the host converts their result into an `Alignment` and saves it through the same storage as the API.

## Fixtures

`fixtures/sample-audio-alignment.json` and `fixtures/sample-translation-alignment.json` hold hand-written `AddAlignmentRequest` bodies for `sample.epub`, with `fixtures/sample-translation.txt` as the translation document. See `fixtures/README.md`.
