"""Marks the passage of a sample book that its short audio clip reads, so that someone testing the book knows where the audio stops."""

START_NOTE = "[Test note: the sample recording reads only the beginning of this chapter, up to the marked point below.]"
END_NOTE = "[Test note: the sample recording ends here.]"


def mark_recorded_passage(chapters, paragraph_index, last_words):
    """Returns the chapters with a note opening the first chapter and another right after `last_words`,
    the end of the recorded text in the first chapter's paragraph `paragraph_index`.
    A paragraph that goes on after `last_words` is split around the second note."""
    (title, paragraphs), *rest = chapters
    paragraph = paragraphs[paragraph_index]
    end = paragraph.index(last_words) + len(last_words)
    recorded, remainder = paragraph[:end], paragraph[end:].strip()
    marked = [START_NOTE, *paragraphs[:paragraph_index], recorded, END_NOTE]
    marked += ([remainder] if remainder else []) + paragraphs[paragraph_index + 1 :]
    return [(title, marked), *rest]
