//! Splitting target-language text into words.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// Splits text on Unicode whitespace. Languages written without spaces need a plugin.
pub fn tokenize_whitespace(text: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut start = None;
    for (offset, character) in text.char_indices() {
        match (character.is_whitespace(), start) {
            (true, Some(token_start)) => {
                tokens.push(Token::new(text, token_start, offset));
                start = None;
            }
            (false, None) => start = Some(offset),
            _ => {}
        }
    }
    if let Some(token_start) = start {
        tokens.push(Token::new(text, token_start, text.len()));
    }
    tokens
}

/// A word together with its byte offsets in the source text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Token {
    pub text: String,
    pub start: usize,
    pub end: usize,
}

impl Token {
    fn new(source: &str, start: usize, end: usize) -> Self {
        Self {
            text: source[start..end].to_string(),
            start,
            end,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn records_byte_offsets_of_each_word() {
        assert_eq!(
            tokenize_whitespace("  the cät "),
            vec![
                Token {
                    text: "the".into(),
                    start: 2,
                    end: 5
                },
                Token {
                    text: "cät".into(),
                    start: 6,
                    end: 10
                }
            ]
        );
    }

    #[test]
    fn produces_no_tokens_for_whitespace_only_text() {
        assert_eq!(tokenize_whitespace(" \n\t"), vec![]);
    }
}
