/// Folds the case of `text` so that spellings that differ only in case compare equal, such as Über and über.
///
/// Letters are lowercased throughout Unicode. Beyond lowercasing, ß and ẞ fold to ss, so that STRASSE finds Straße,
/// the final sigma ς folds to σ, and the dotted capital İ folds to i.
/// Text without case, such as kana and kanji, is returned unchanged.
pub fn fold_case(text: &str) -> String {
    let mut folded = String::with_capacity(text.len());
    for character in text.chars() {
        match character {
            'ß' | 'ẞ' => folded.push_str("ss"),
            'ς' => folded.push('σ'),
            'İ' => folded.push('i'),
            _ => folded.extend(character.to_lowercase()),
        }
    }
    folded
}

#[cfg(test)]
mod tests {
    use super::fold_case;

    #[test]
    fn lowercases_ascii_letters() {
        assert_eq!(fold_case("Cat"), "cat");
    }

    #[test]
    fn lowercases_a_german_umlaut() {
        assert_eq!(fold_case("Ärger"), "ärger");
    }

    #[test]
    fn folds_eszett_to_double_s() {
        assert_eq!(fold_case("Straße"), fold_case("STRASSE"));
    }

    #[test]
    fn folds_capital_eszett_to_double_s() {
        assert_eq!(fold_case("STRAẞE"), "strasse");
    }

    #[test]
    fn lowercases_cyrillic() {
        assert_eq!(fold_case("Москва"), "москва");
    }

    #[test]
    fn folds_a_final_sigma_like_a_medial_one() {
        assert_eq!(fold_case("ΛΌΓΟΣ"), fold_case("λόγος"));
    }

    #[test]
    fn folds_a_dotted_capital_i_to_a_plain_i() {
        assert_eq!(fold_case("İstanbul"), "istanbul");
    }

    #[test]
    fn leaves_japanese_unchanged() {
        assert_eq!(fold_case("食べさせられる"), "食べさせられる");
    }
}
