use super::separated_verb::ContextWord;
use super::word_boundary::is_word_boundary;

/// The marks after which no separated particle is sought: the ends of sentences, and the semicolon and colon,
/// which join clauses that each have their own finite verb.
const SENTENCE_ENDS: [char; 5] = ['.', '!', '?', ';', ':'];

/// A word or comma of the sentence around a looked-up word. Other punctuation, such as quotation marks, is left out.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SentenceToken {
    Word(ContextWord),
    Comma,
}

/// The sentence of `context` that holds the character at `offset`, with the index of the word there.
/// Sentences are split naively at every end mark, so an abbreviation such as z. B. also ends one.
pub fn sentence_around(context: &str, offset: usize) -> Option<(Vec<SentenceToken>, usize)> {
    let mut sentence: Vec<SentenceToken> = Vec::new();
    let mut clicked = None;
    let mut word: Option<ContextWord> = None;
    for (position, character) in context.chars().enumerate() {
        if !is_word_boundary(character) {
            let current = word.get_or_insert_with(|| ContextWord {
                text: String::new(),
                start: position,
            });
            current.text.push(character);
            if position == offset {
                clicked = Some(sentence.len());
            }
            continue;
        }
        if let Some(finished) = word.take() {
            sentence.push(SentenceToken::Word(finished));
        }
        if character == ',' {
            sentence.push(SentenceToken::Comma);
        } else if SENTENCE_ENDS.contains(&character) {
            if clicked.is_some() {
                break;
            }
            sentence.clear();
        }
    }
    if let Some(finished) = word.take() {
        sentence.push(SentenceToken::Word(finished));
    }
    clicked.map(|index| (sentence, index))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn words(tokens: &[SentenceToken]) -> Vec<&str> {
        tokens
            .iter()
            .map(|token| match token {
                SentenceToken::Word(word) => word.text.as_str(),
                SentenceToken::Comma => ",",
            })
            .collect()
    }

    #[test]
    fn keeps_only_the_sentence_of_the_clicked_word() {
        let (sentence, _) = sentence_around("Es regnet. Ich rufe an. Gut!", 12).unwrap();
        assert_eq!(words(&sentence), ["Ich", "rufe", "an"]);
    }

    #[test]
    fn finds_the_index_of_the_clicked_word() {
        assert_eq!(sentence_around("Ich rufe dich an.", 6).unwrap().1, 1);
    }

    #[test]
    fn keeps_commas_and_leaves_out_quotation_marks() {
        let (sentence, _) = sentence_around("„Ja“, sagt er.", 1).unwrap();
        assert_eq!(words(&sentence), ["Ja", ",", "sagt", "er"]);
    }

    #[test]
    fn counts_the_start_of_a_word_in_characters() {
        let (sentence, index) = sentence_around("Ö ü an", 4).unwrap();
        assert_eq!(
            sentence[index],
            SentenceToken::Word(ContextWord {
                text: "an".into(),
                start: 4
            })
        );
    }

    #[test]
    fn finds_no_word_at_a_space() {
        assert!(sentence_around("Ich rufe", 3).is_none());
    }
}
