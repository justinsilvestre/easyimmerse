//! Other spellings of the looked-up text, tried alongside it: lowercase at the start of a sentence,
//! the spelling of ß before the 1996 reform, and the Swiss ss for ß.

/// The most occurrences of ss that are each tried both ways. A word with more is tried only as written and with every ss as ß.
const MAX_SS_CHOICES: usize = 3;

/// Lists `text` and its other spellings, without repeats, starting with `text` itself.
///
/// - A capitalized word is also tried in lowercase, because the first word of a sentence is capitalized
///   (Amtliches Regelwerk 2024, § 54, p. 81).
/// - Before 1996, ß was also written after a short vowel at the end of a word or before a consonant (daß, mußte),
///   where ss is written now (<https://de.wikipedia.org/w/index.php?title=Adelungsche_s-Schreibung&oldid=258893330>,
///   which cites Adelung 1788 and Noack 2000; Amtliches Regelwerk 2024, § 25 and E1, p. 48).
/// - In Switzerland and Liechtenstein ss may always be written for ß (Amtliches Regelwerk 2024, § 25 E2, p. 48).
pub(super) fn variants(text: &str) -> Vec<String> {
    let cases = [Some(text.to_string()), decapitalized(text)];
    let mut variants: Vec<String> = Vec::new();
    for case in cases.into_iter().flatten() {
        let spellings =
            std::iter::once(pre_reform_to_current(&case)).chain(swiss_to_standard(&case));
        for spelling in std::iter::once(case.clone()).chain(spellings) {
            if !variants.contains(&spelling) {
                variants.push(spelling);
            }
        }
    }
    variants
}

fn decapitalized(text: &str) -> Option<String> {
    let mut characters = text.chars();
    let first = characters.next().filter(|first| first.is_uppercase())?;
    Some(first.to_lowercase().chain(characters).collect())
}

/// Replaces each ß at the end of the word or before a consonant with ss.
fn pre_reform_to_current(text: &str) -> String {
    let characters: Vec<char> = text.chars().collect();
    let mut result = String::with_capacity(text.len() + 1);
    for (index, character) in characters.iter().enumerate() {
        let next = characters.get(index + 1);
        if *character == 'ß' && next.is_none_or(|next| !is_vowel(*next)) {
            result.push_str("ss");
        } else {
            result.push(*character);
        }
    }
    result
}

/// Lists the spellings with some or all of the ss in `text` written as ß.
fn swiss_to_standard(text: &str) -> Vec<String> {
    let positions: Vec<usize> = text.match_indices("ss").map(|(index, _)| index).collect();
    if positions.len() > MAX_SS_CHOICES {
        return vec![text.replace("ss", "ß")];
    }
    (1..1usize << positions.len())
        .map(|choice| replace_chosen(text, &positions, choice))
        .collect()
}

fn replace_chosen(text: &str, positions: &[usize], choice: usize) -> String {
    let mut result = String::with_capacity(text.len());
    let mut start = 0;
    for (bit, position) in positions.iter().enumerate() {
        if choice & (1 << bit) != 0 {
            result.push_str(&text[start..*position]);
            result.push('ß');
            start = position + 2;
        }
    }
    result.push_str(&text[start..]);
    result
}

fn is_vowel(character: char) -> bool {
    "aeiouyäöüAEIOUYÄÖÜ".contains(character)
}

#[cfg(test)]
mod tests {
    use super::variants;

    #[test]
    fn puts_the_text_first() {
        assert_eq!(variants("Haus")[0], "Haus");
    }

    #[test]
    fn tries_a_capitalized_word_in_lowercase() {
        assert!(variants("Gingen").contains(&"gingen".to_string()));
    }

    #[test]
    fn tries_a_capital_umlaut_in_lowercase() {
        assert!(variants("Über").contains(&"über".to_string()));
    }

    #[test]
    fn spells_a_final_eszett_as_ss() {
        assert!(variants("daß").contains(&"dass".to_string()));
    }

    #[test]
    fn spells_an_eszett_before_a_consonant_as_ss() {
        assert!(variants("mußte").contains(&"musste".to_string()));
    }

    #[test]
    fn keeps_an_eszett_before_a_vowel() {
        assert_eq!(variants("Straße"), ["Straße", "straße"]);
    }

    #[test]
    fn spells_a_swiss_ss_as_eszett() {
        assert!(variants("Strasse").contains(&"Straße".to_string()));
    }

    #[test]
    fn spells_each_swiss_ss_either_way() {
        assert!(variants("Schlossstrasse").contains(&"Schlossstraße".to_string()));
    }
}
