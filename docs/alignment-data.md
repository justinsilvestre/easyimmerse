# Alignment data

An *alignment* records how one document (an ebook or text file in a project) lines up with something else: the audio file that reads it aloud, or a second document that translates it. Alignments are produced by a provider (the easyImmerse cloud or an installed plugin) or imported from a file, saved in the project's database, and read by the ebook reader to play matching audio, highlight the spoken text, and show translations beside the text.

The Rust types in `crates/core/src/alignment.rs` are the source of truth; this page explains the shape and the reasoning so providers, importers and the reader agree on it. The design follows a survey of existing formats, summarised under [Prior art](#prior-art): none of them addresses two independently parsed books, so easyImmerse keeps a small native format and will convert the others into it.

## Addressing text

Documents have no ids inside them. A parsed `Document` is a list of chapters, each a list of paragraph strings, so a piece of text is addressed by position, with the text itself as an anchor:

```
TextSpan { chapter_index, paragraph_index, start, end, quote }
```

- `chapter_index` and `paragraph_index` count from zero within the parsed document.
- `start` and `end` are offsets into the paragraph string, counted in UTF-16 code units, exactly as JavaScript's `String` indexes them. `end` is exclusive. The reader already addresses words and reading locations this way (`ReaderLocation`, `TextSpan` in `wordAt.ts`), so no conversion is needed on the client. Rust code treats the offsets as opaque numbers; it does not slice paragraphs by them. (The W3C Web Annotation `TextPositionSelector` counts code points instead; a converter must not treat the two as the same.)
- `quote` is the text the span covers, as the parser produced it. It is optional in the type so that the reader's own tests can write spans tersely, but every provider and importer sets it. The position is a cache that is only valid for the document as the current parser produces it; the quote is what identifies the passage once the parser changes how it splits paragraphs or collapses whitespace. Today the reader compares the quote with the text at the position and ignores a span whose quote no longer matches, so a stale alignment degrades to "not aligned here" rather than highlighting the wrong words. Re-anchoring a stale span by searching for its quote, with prefix and suffix context to tell repeated sentences apart as the Web Annotation `TextQuoteSelector` does, is the intended next step and needs no change of format.
- A span never crosses a paragraph. Something that covers several paragraphs is a list of spans. Keeping a span inside one paragraph keeps the reader's rendering and lookups simple, and because positions are revalidated through the quote anyway, a span that a later parser would split across paragraphs is re-anchored rather than stretched.
- A span addresses the paragraph as the parser produced it, before the reader's `unwrapHardLineBreaks`, which keeps offsets unchanged by design.

Sentence boundaries are not part of the format. The reader finds sentences with `Intl.Segmenter` to decide what a click means; an alignment's spans may be larger or smaller than those sentences, and a click resolves to whichever span or link contains it.

## Two kinds of alignment

Both kinds are variants of one `AlignmentContent` enum, tagged by `kind` in JSON.

### Audio

```
{ "kind": "audio",
  "audio_media_file_id": "<media file id>",
  "segments": [ { "span": TextSpan, "start_ms": u64, "end_ms": u64 }, ... ] }
```

Each `TimedSpan` says that `span` is heard between `start_ms` and `end_ms` of the audio file. Segments are sorted by their span's position in the document; narration is normally sequential, but the reader does not assume that times increase with position. A provider usually emits one segment per sentence; an EPUB media overlay may only give one per paragraph, and an importer keeps that granularity rather than guessing sentence times. Text with no segment (a chapter title, a footnote) is simply never highlighted. Times are milliseconds, as everywhere in the crates.

### Translation

```
{ "kind": "translation",
  "translation_media_file_id": "<media file id>",
  "links": [ { "spans": [TextSpan, ...], "translation_spans": [TextSpan, ...] }, ... ] }
```

Each `TranslationLink` pairs text of the document (`spans`) with the text of the translation document (`translation_spans`) that says the same thing. Either side may hold several spans, for a sentence that the translation splits in two or joins with the next, and either side may be empty for text the translation leaves out or adds; a link with both sides empty is invalid. Links are sorted by the position of their first document span; links with no document span are sorted by their first translation span. Spans on each side are sorted and do not overlap. The parallel view assumes links do not cross; crossing links are allowed in the data and are shown in document order.

The translation is itself a document in the project (an EPUB or text file), so both sides are addressed the same way and the reader can show either one alone. The format carries no translated strings of its own.

## The record

```
Alignment { id, media_file_id, provider, created_at_ms, content }
```

- `media_file_id` is the document the alignment belongs to. Its counterpart (the audio file or the translation) is named inside `content`.
- `provider` names what produced it (a plugin name, or `cloud`), or is null for an alignment added from a file.
- A document can have several alignments, for example one with its audiobook and one with its translation, or two with the same audiobook from different providers. Nothing overwrites an earlier one; the reader uses the newest of each kind.

Alignments live in the `alignments` table in the project database, keyed by the document's media file id, with the counterpart's id in its own column so that removing either file removes the alignment. They are read and written through the API:

- `GET /projects/{id}/media/{media_id}/alignments` lists the document's alignments.
- `POST /projects/{id}/media/{media_id}/alignments` adds one from an `AddAlignmentRequest { provider, content }`.
- `DELETE /projects/{id}/media/{media_id}/alignments/{alignment_id}` removes one.

## Pairing a translation before it is aligned

A person can open a translation of a book before the two are aligned, to read either language on its own. That pairing is not an alignment: it is the `translation_media_file_id` of the document's media file record, set through `PUT /projects/{id}/media/{media_id}/translation-document`. Combining the two into a bilingual ebook asks a provider to produce a translation alignment between them.

## Source provenance of a parsed document

The EPUB parser flattens each content document into paragraphs and drops element ids, but synchronised EPUBs (media overlays, DAISY books) address their text by those ids. So the parser also records where each paragraph came from, in `Document.provenance`:

```
DocumentProvenance { chapters: [ ChapterProvenance { href, paragraphs: [ ParagraphProvenance { element_id, inline_ids: [ { id, start, end } ] } ] } ] }
```

`href` is the content document's path inside the EPUB, `element_id` is the id of the block the paragraph was extracted from, and `inline_ids` are the ids of elements inside it with the UTF-16 range of their text in the paragraph. Plain text files have no provenance. This is enough to turn an overlay's `chapter1.xhtml#s12` into a `TextSpan`; the converter itself is not written yet.

## What a provider sees

The `alignment` plugin interface (`crates/plugin-api/wit/alignment.wit`) currently aligns an audio file with a transcript given as a list of strings and returns a timed-text track. Aligning a document with its audio, or two documents with each other, needs interfaces of their own. The plan is for the host to hand a provider the text as fragments with request-scoped ids (sentences or paragraphs of the parsed document) and for the provider to return timed fragments or links between fragment ids; the host then resolves the ids back into `TextSpan`s with quotes and saves an `Alignment`. Providers never see positions, quotes or the database, which keeps plugins small and the anchoring rules in one place.

## Prior art

Formats surveyed before settling the shape above, and what easyImmerse intends to do with each:

- **EPUB 3 Media Overlays (SMIL)**, and DAISY before them: `<par>` pairs a `text src="file.xhtml#id"` with an `audio` clip. The standard way an EPUB ships its own narration, and the first import to add, through the provenance above. Export would mean writing a whole EPUB with ids, so it comes later.
- **Readium's media-overlay and guided-navigation JSON**: the same model as `textref` and `audioref` pairs; a good interchange shape, not a storage model.
- **W3C SyncMedia / Synchronized Narration**: drafts that have not settled; worth following, not building on.
- **aeneas sync maps** (JSON fragments with `begin`, `end`, `lines`, also SMIL, WebVTT and TTML): the common forced-alignment output. Its JSON carries the text, so it can be imported by matching the lines against the document in order. Second import to add, together with WebVTT, which the app already parses.
- **hunalign, vecalign, bertalign**: sentence aligners whose output is groups of sentence indexes on each side, many-to-many with empty sides. `TranslationLink` is that shape with spans instead of indexes, since indexes only mean something next to the exact sentence lists the aligner saw; an importer takes the output together with those lists.
- **TMX, XLIFF, TEI `linkGrp`**: translation-industry and scholarly interchange. TMX and XLIFF carry text pairs without positions in a book; TEI links addressable passages, the closest conceptual match. All are later import or export targets.
- **W3C Web Annotation selectors**: the precedent for position plus quote anchoring, adopted here.

Deliberately left out for now, to be added when a provider or importer needs them: a content hash of the parsed text to detect stale positions in one comparison, ids on individual links and segments, a timing-quality flag for estimated clip times, and structured confidence values.

## Fixtures

`fixtures/sample-audio-alignment.json` and `fixtures/sample-translation-alignment.json` hold hand-written `AddAlignmentRequest` bodies for `sample.epub`, with `fixtures/sample-translation.txt` as the translation document. See `fixtures/README.md`.
