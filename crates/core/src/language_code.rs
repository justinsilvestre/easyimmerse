//! Comparing language tags written with different code sets: media containers tag tracks with
//! three-letter ISO 639-2 codes such as `jpn`, while projects and file names use BCP 47 tags,
//! which take the two-letter ISO 639-1 code where one exists, such as `ja`.

/// ISO 639-2 codes and the ISO 639-1 code of the same language, for the languages most likely
/// to appear in a media library, after the Library of Congress's ISO 639-2 code list.
/// Languages with a separate bibliographic code, such as German (`ger` beside `deu`), have
/// both codes listed.
const TWO_LETTER_CODES: [(&str, &str); 98] = [
    ("afr", "af"),
    ("alb", "sq"),
    ("amh", "am"),
    ("ara", "ar"),
    ("arm", "hy"),
    ("aze", "az"),
    ("baq", "eu"),
    ("bel", "be"),
    ("ben", "bn"),
    ("bos", "bs"),
    ("bul", "bg"),
    ("bur", "my"),
    ("cat", "ca"),
    ("ces", "cs"),
    ("chi", "zh"),
    ("cym", "cy"),
    ("cze", "cs"),
    ("dan", "da"),
    ("deu", "de"),
    ("dut", "nl"),
    ("ell", "el"),
    ("eng", "en"),
    ("epo", "eo"),
    ("est", "et"),
    ("eus", "eu"),
    ("fas", "fa"),
    ("fin", "fi"),
    ("fra", "fr"),
    ("fre", "fr"),
    ("geo", "ka"),
    ("ger", "de"),
    ("gle", "ga"),
    ("glg", "gl"),
    ("gre", "el"),
    ("guj", "gu"),
    ("hau", "ha"),
    ("heb", "he"),
    ("hin", "hi"),
    ("hrv", "hr"),
    ("hun", "hu"),
    ("hye", "hy"),
    ("ibo", "ig"),
    ("ice", "is"),
    ("ind", "id"),
    ("isl", "is"),
    ("ita", "it"),
    ("jpn", "ja"),
    ("kan", "kn"),
    ("kat", "ka"),
    ("kaz", "kk"),
    ("khm", "km"),
    ("kir", "ky"),
    ("kor", "ko"),
    ("kur", "ku"),
    ("lao", "lo"),
    ("lat", "la"),
    ("lav", "lv"),
    ("lit", "lt"),
    ("ltz", "lb"),
    ("mac", "mk"),
    ("mal", "ml"),
    ("mar", "mr"),
    ("may", "ms"),
    ("mkd", "mk"),
    ("mlt", "mt"),
    ("mon", "mn"),
    ("msa", "ms"),
    ("mya", "my"),
    ("nep", "ne"),
    ("nld", "nl"),
    ("nno", "nn"),
    ("nob", "nb"),
    ("nor", "no"),
    ("pan", "pa"),
    ("per", "fa"),
    ("pol", "pl"),
    ("por", "pt"),
    ("pus", "ps"),
    ("ron", "ro"),
    ("rum", "ro"),
    ("rus", "ru"),
    ("sin", "si"),
    ("slk", "sk"),
    ("slo", "sk"),
    ("slv", "sl"),
    ("som", "so"),
    ("spa", "es"),
    ("sqi", "sq"),
    ("srp", "sr"),
    ("swa", "sw"),
    ("swe", "sv"),
    ("tam", "ta"),
    ("tel", "te"),
    ("tgl", "tl"),
    ("tha", "th"),
    ("tur", "tr"),
    ("ukr", "uk"),
    ("urd", "ur"),
];

/// Whether two language tags name the same language, comparing only their primary language
/// subtags, without regard to case, and reading a known three-letter code as its two-letter
/// equivalent. `eng`, `en` and `en-US` all name the same language.
pub fn is_same_language(left: &str, right: &str) -> bool {
    primary_language(left) == primary_language(right)
}

/// The primary language subtag of a tag in lower case, as a two-letter code where the table
/// knows one.
fn primary_language(tag: &str) -> String {
    let primary = tag
        .split(['-', '_'])
        .next()
        .unwrap_or(tag)
        .to_ascii_lowercase();
    match TWO_LETTER_CODES.binary_search_by_key(&primary.as_str(), |(three, _)| three) {
        Ok(position) => TWO_LETTER_CODES[position].1.to_owned(),
        Err(_) => primary,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_a_three_letter_code_to_its_two_letter_code() {
        assert!(is_same_language("eng", "en"));
    }

    #[test]
    fn matches_a_bibliographic_code_to_its_terminology_code() {
        assert!(is_same_language("ger", "deu"));
    }

    #[test]
    fn matches_a_three_letter_code_to_a_tag_with_a_region() {
        assert!(is_same_language("jpn", "ja-JP"));
    }

    #[test]
    fn ignores_case() {
        assert!(is_same_language("JPN", "ja"));
    }

    #[test]
    fn matches_two_unknown_codes_that_are_equal() {
        assert!(is_same_language("fil", "fil"));
    }

    #[test]
    fn tells_different_languages_apart() {
        assert!(!is_same_language("eng", "ja"));
    }

    #[test]
    fn does_not_match_an_undetermined_language_to_any_language() {
        assert!(!is_same_language("und", "en"));
    }

    #[test]
    fn keeps_the_table_sorted_for_binary_search() {
        assert!(
            TWO_LETTER_CODES
                .windows(2)
                .all(|pair| pair[0].0 < pair[1].0)
        );
    }
}
