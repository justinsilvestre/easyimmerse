/// The style of the note type's cards. It sets no colors, so that cards follow Anki's light and dark themes,
/// and mutes secondary text through opacity instead.
pub(crate) const CARD_CSS: &str = "\
.card {
  font-family: system-ui, -apple-system, \"Segoe UI\", sans-serif;
  font-size: 20px;
  line-height: 1.5;
  text-align: center;
}

.word {
  font-size: 1.6em;
  font-weight: 600;
}

.pronunciation {
  font-size: 0.9em;
  opacity: 0.65;
}

.sentence {
  margin-top: 0.5em;
}

.translation {
  opacity: 0.8;
}

.definition {
  margin: 0.5em auto;
  max-width: 36em;
}

.definition ul,
.definition ol {
  display: inline-block;
  margin: 0;
  text-align: left;
}

.audio,
.screenshot {
  margin-top: 0.5em;
}

.screenshot img {
  max-width: 100%;
  max-height: 50vh;
  border-radius: 6px;
}

hr#answer {
  margin: 1em 0;
  opacity: 0.4;
}
";
