//! Classical forms that survive in modern writing: the conjectural auxiliary む and the attributive き of adjectives.

use crate::deinflection::japanese::rule::{Rule, Stem};
use crate::deinflection::japanese::word_class::WordClasses as C;

/// む ("will, would") on the irrealis stem, and its later form ん, as in 去らんとする and 泣かんばかり.
/// ん is also a negative (see the negative rules), so a word in ん is traced back both ways.
///
/// Sources: 規程集 下, 資料「要注意語」助動詞 ム, p. (35) (接続: 未然形; example さもありな【ん】);
/// UniDic 2025.12, 文語助動詞-ム (終止形-一般 む, 終止形-撥音便 ん).
pub const CONJECTURE: &[Rule] = &[
    Rule::replace("む", "")
        .to(C::IRREALIS)
        .named(&["conjecture"]),
    Rule::replace("ん", "")
        .to(C::IRREALIS)
        .named(&["conjecture"]),
];

/// The attributive form in き of classical adjectives (若き, 美しき), traced back to the modern adjective.
///
/// Source: UniDic 2025.12, 文語形容詞-ク and 文語形容詞-シク in 連体形-一般, whose lemma is the modern adjective
/// (若き has the lemma 若い).
pub const ATTRIBUTIVE: &[Rule] = &[Rule::replace("き", "い")
    .to(C::ADJ_I)
    .named(&["attributive"])
    .stem(Stem::NonEmpty)];

#[cfg(test)]
mod tests {
    use crate::deinflection::japanese::test_support::yields;

    #[test]
    fn undoes_mu() {
        assert!(yields("行かむ", "行く", "v5", &["conjecture"]));
    }

    #[test]
    fn undoes_mu_after_an_ichidan_stem() {
        assert!(yields("見む", "見る", "v1", &["conjecture"]));
    }

    #[test]
    fn undoes_n_as_a_conjecture() {
        assert!(yields("去らん", "去る", "v5", &["conjecture"]));
    }

    #[test]
    fn undoes_the_attributive_ki() {
        assert!(yields("若き", "若い", "adj-i", &["attributive"]));
    }

    #[test]
    fn undoes_the_attributive_ki_of_a_shiku_adjective() {
        assert!(yields("美しき", "美しい", "adj-i", &["attributive"]));
    }
}
