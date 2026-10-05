# Japanese deinflection

The Japanese deinflector in `crates/core/src/deinflection/japanese/` traces an inflected word back to the dictionary forms it may come from. It replaces kana endings, chaining rules so that stacked inflections are undone one at a time: 食べさせられなかった is traced through 食べさせられない, 食べさせられる and 食べさせる to 食べる.

Lookup tries every prefix of the text, longest first, and deinflects each one. The deinflector therefore only has to undo what stops a prefix from being a dictionary word. Text it leaves alone splits into words that a dictionary has: 食べやすい is found as 食べ, the continuative of 食べる, and the next lookup finds やすい.

Every rule group is drawn from the sources below and cites them in a doc comment above its table. No GPL or GPL-derived deinflector (Yomitan, Yomichan, 10ten Reader, rikaichan, rikaikun, Nazeka, or the crates and packages derived from them) and no JMdictDB conjugation table was read or used.

## Sources

| Short name | Source |
|---|---|
| 規程集 下 | 小椋秀樹・小磯花絵・冨士池優美・宮内佐夜香・小西光・原裕『「現代日本語書き言葉均衡コーパス」形態論情報規程集 第4版（下）』, LR-CCG-10-05-02, 国立国語研究所, 2011. <https://doi.org/10.15084/00002856> |
| UniDic manual | 伝康晴・山田篤・小椋秀樹・小磯花絵・小木曽智信『UniDic version 1.3.9 ユーザーズマニュアル』, 2008. <https://clrd.ninjal.ac.jp/unidic/UNIDIC_manual.pdf> |
| UniDic 2025.12 | 現代書き言葉UniDic ver. 2025.12 (`unidic-cwj-202512`), 国立国語研究所. The lexicon lists every conjugated form of every word with its conjugation type (活用型) and form (活用形). <https://clrd.ninjal.ac.jp/unidic/> |
| ニッポニカ 助動詞 | 青木伶子「助動詞」, 日本大百科全書（ニッポニカ）, on Kotobank. <https://kotobank.jp/word/助動詞-80527> |
| マイペディア 助動詞 | 「助動詞」, 百科事典マイペディア, on the same Kotobank page. |

The 規程集 is normative: UniDic is built to it, and it gives a rule number, page and corpus examples for each decision. Its pages are cited as printed, so the word lists in its appendix (資料「要注意語」) have page numbers in parentheses. UniDic's type and form names are the same in the 2008 manual and the 2025.12 lexicon.

## Scope

The deinflector undoes these, as UniDic and the 規程集 analyse short units (短単位):

1. **A conjugated form (活用形) of the word itself**, including the volitional (意志推量形, UniDic manual §5.3, p. 19), the fused provisional (仮定形-融合, p. 20), the forms in ん (撥音便), the bare continuative (連用形) and the adjective stem (語幹).
2. **An auxiliary verb (助動詞)**, with the auxiliary's own conjugated forms. The 規程集 lists them in 下, 資料「要注意語」助動詞, pp. (31)–(36); UniDic 2025.12 gives their paradigms. This includes the contractions of て with a subsidiary verb that the 規程集 classes as auxiliaries: てる, とる, とく, てく, ちゃう, ちまう, たげる, たる and てらっしゃる (規程集 下 pp. (33)–(34); 最小単位認定規程 1.1, p. 2).
3. **A conjunctive particle fused to a form that cannot stand alone**: て and たり after a euphonic stem, ば after the hypothetical stem, and ちゃ for ては. Without these, lookup would stop at a stem that is not a word, such as 書い or 書け.

It leaves alone:

- **Subsidiary verbs (補助動詞) after the te-form**: ている, てある, ておく, ていく, てくる, てしまう, てみる. 規程集 下, 短単位認定規程 規定5 (p. 33) makes an attached element a short unit of its own, and UniDic classes いる, おく, しまう and the rest as 動詞-非自立可能. ニッポニカ 助動詞 gives the school-grammar test: a particle can come between the te-form and the subsidiary verb (笑ってはいる), so these are not auxiliaries.
- **Suffixes and attached elements (接尾辞, 付属要素)**: やすい, にくい, づらい, がる, げ and the nominal さ (規程集 下, 資料「要注意語」接尾的要素, pp. (41)–(53)), and すぎる and なさる (動詞-非自立可能, pp. (45) and (49)).
- **Particles after a form that can stand alone**: ながら after the continuative (規程集 下 p. (28)), で after ない, か after the volitional, な after the dictionary form.

The contractions are undone although the full forms are not, because only the full forms split at a word boundary: 食べて + いる are two words, but 食べてる cut anywhere leaves a fragment.

Two items follow school grammar rather than UniDic's split:

- **Appearance そう** (食べそう, 高そう, よさそう, なさそう) is undone. School grammar counts 様態の そうだ as an auxiliary (ニッポニカ 助動詞; マイペディア 助動詞). UniDic instead splits off そう as the stem of a nominal auxiliary (規程集 下, 資料「要注意語」ソウ, ID 72, p. (45)), which would leave the bare stem to lookup; both readings reach the same word.
- **たがる** is undone. Both the 規程集 (下 p. (33)) and school grammar class it as an auxiliary.

### Bare stems as results

The bare continuative of a verb and the stem of an i-adjective are reported as results, named `continuative` and `stem`: 食べ gives 食べる, し gives する, 高 gives 高い. They are what lookup finds before a suffix or a subsidiary verb (食べやすい, 高すぎる, 書きながら, 寒がる). An adjective reached from its bare stem is not deinflected further, so that the stems of the auxiliaries ない and たい (な, た) do not lead on to a verb.

Lookup ranks a longer match first and, among matches of the same length, fewer inflections first. A one-kana stem such as し or き therefore never outranks a longer match, and it ranks below an unchanged word of the same length, such as the particle し. The lookup tests in `crates/core/src/lookup/japanese_splits.rs` show each of these cases.

## Word classes

Results carry the six classes that Yomitan-format dictionaries put in their rules column: `v1` (ichidan), `v5` (godan), `vk` (来る), `vs` (する and its compounds), `vz` (ずる verbs) and `adj-i`. While a chain is being undone, rules also pass through intermediate states: the continuative stem, the irrealis stem, the two euphonic stems (before た and て, and before だ and で), the adjective stem, and the adjective continuative (高く, 高う). Rules that turn a stem back into a dictionary form undo no inflection of their own; the suffix rule that produced the stem names the inflection.

When two chains reach the same term with the same inflections, their classes are merged into one result.

## Inflection names

Results list inflections outermost first, so 食べさせられなかった gives `past`, `negative`, `passive`, `causative`.

| Name | Forms |
|---|---|
| `continuative` | the bare 連用形: 食べ, 書き, し, き, いらっしゃい |
| `stem` | the bare adjective stem: 高, 寂し |
| `past` | た, だ; adjective かった; ませんでした |
| `te-form` | て, で; adjective くて, くって, うて |
| `te-wa` | ちゃ, じゃ for ては, では; adjective くちゃ |
| `conditional` | たら, だら, たらば; adjective かったら |
| `representative` | たり, だり; adjective かったり |
| `provisional` | ば after the hypothetical stem; the fused きゃ, りゃ, や; adjective ければ, けりゃ, きゃ; ねば, にゃ |
| `negative` | ない, ぬ, ん, ざる, へん, ひん; adjective くない, うない; ない as the negative of ある |
| `negative continuative` | ず |
| `polite` | ます and its forms |
| `volitional` | う, よう and their short forms (行こ, 行こっ); adjective かろう; たろう after た |
| `negative volitional` | まい |
| `imperative` | え row, ろ, よ, こい, しろ, せよ; honorific い; ませ, まし |
| `potential` | える, (ら)れる, これる |
| `passive` | れる, られる, される |
| `causative` | せる, させる, and the short continuative し, さし |
| `desiderative` | たい |
| `third-person desiderative` | たがる |
| `contemptuous` | やがる |
| `appearance` | そう |
| `adverbial` | adjective く, う |
| `progressive` | てる, でる; とる, どる |
| `preparatory` | とく, どく |
| `continuing` | てく, でく |
| `completive` | ちゃう, じゃう, ちまう, じまう |
| `benefactive` | たげる, だげる; たる, だる |
| `honorific progressive` | てらっしゃる, でらっしゃる |
| `honorific` | western はる |
| `conjecture` | classical む and its later form ん |
| `attributive` | classical adjective き |
| `colloquial` | final る as ん (触んな); fused adjective vowels (やべえ, すげえ, さみい, 高え, ええ) |

## Rule groups

| Group | Table | Covers | Sources |
|---|---|---|---|
| Bare stems | `rules/stems.rs` `BARE` | the continuative and the adjective stem as results | UniDic manual §5.3, p. 19; 規程集 下 規定5, p. 33 |
| Continuative stems | `rules/stems.rs` `CONTINUATIVE` | godan い row, ichidan bare stem, き, し, じ; いらっしゃい, おっしゃい, ください, なさい, ござい | UniDic manual §5.2.1, p. 17 (五段-ラ行-アル); UniDic 2025.12 連用形-一般, 連用形-イ音便 |
| Irrealis stems | `rules/stems.rs` `IRREALIS` | godan あ row, ichidan bare stem, こ, し, せ, じ, ぜ; ん for る (分かん), りる (足ん), くれる, れる and られる (らん) | UniDic manual §5.3, pp. 19–20 (未然形-セ, 未然形-撥音便); UniDic 2025.12 未然形 |
| Euphonic stems | `rules/stems.rs` `ONBIN_TA`, `ONBIN_DA` | い, voiced い, し, っ, ん; 行っ, 逝っ, 往っ; てっ for てく | UniDic manual §5.2.1, p. 17 (五段-カ行-イク); UniDic 2025.12 連用形 音便 |
| U-sound stems | `rules/stems.rs` `U_ONBIN` | 問うた, 買うた, もろうた | UniDic 2025.12, 五段-ワア行 連用形-ウ音便 |
| Past, te-form and others | `rules/perfective.rs` | た, たら, たらば, たろう, て, たり, ちゃ and their voiced forms | 規程集 下 pp. (27), (32); 最小単位認定規程 1.1, p. 2; UniDic 2025.12 助動詞-タ, 助詞 て (ちゃ, じゃ) |
| Negative | `rules/negative.rs` `NEGATIVE` | ない, ぬ, ん, んかった, ざる, ず, ねば, にゃ; ない for ある | 規程集 下 pp. (32), (35); UniDic manual §5.3, p. 20; UniDic 2025.12 助動詞-ナイ, 助動詞-ヌ, 文語助動詞-ズ |
| Western negative | `rules/negative.rs` `WESTERN_NEGATIVE`, `WESTERN_NEGATIVE_STEMS` | へん, ひん, へんかった; 書けへん, せえへん, しいひん, けえへん, こおへん, きいひん | UniDic 2025.12 助動詞-ヘン, 助動詞-ヒン, and the 未然形 rows 書け, せえ, しい, けえ, こお, きい |
| Polite | `rules/polite.rs` | ます, ました, ません, ませんでした, ませんかった, ましょう, ましょ, ましょっ, ますまい, まして, ましたら, ますれば, ませ, まし | 規程集 下 p. (35); UniDic manual §5.3, p. 19; UniDic 2025.12 助動詞-マス |
| Volitional | `rules/volitional.rs` `VOLITIONAL`, `SHORT_VOLITIONAL` | お row + う, よう, こよう, しよう, じよう, and the forms without う or with っ | UniDic manual §4.1, p. 11, and §5.3, p. 19; UniDic 2025.12 意志推量形 |
| Negative volitional | `rules/volitional.rs` `NEGATIVE_VOLITIONAL` | まい after the dictionary form, the ichidan stem, し, す, こ | 規程集 下 p. (35); UniDic 2025.12 助動詞-マイ |
| Imperative | `rules/imperative.rs` | え row, ろ, よ, こい, しろ, せよ, じろ, ぜよ, honorific い, くれ | UniDic manual §5.2.1, p. 17; UniDic 2025.12 命令形 |
| Provisional | `rules/provisional.rs` `PROVISIONAL`, `FUSED_PROVISIONAL` | え row + ば, れば, くれば, すれば, ずれば; きゃ, りゃ, や, くりゃ, すりゃ, ずりゃ | 規程集 下 p. (30); 最小単位認定規程 1.1, p. 2; UniDic manual §5.3, p. 20; UniDic 2025.12 仮定形 |
| Potential | `rules/voice.rs` `POTENTIAL` | え row + る, られる, colloquial れる, こられる, これる, じられる, ぜられる | 規程集 下 p. (36); UniDic 2025.12 (the lemma 書く of 書ける, 食べる of 食べれる) |
| Passive | `rules/voice.rs` `PASSIVE` | あ row + れる, られる, こられる, される, せられる, じられる, ぜられる | 規程集 下 p. (36); UniDic manual §5.3, p. 19 (未然形-サ); UniDic 2025.12 助動詞-レル |
| Causative | `rules/voice.rs` `CAUSATIVE`, `SHORT_CAUSATIVE` | あ row + せる, させる, こさせる, じさせる, ぜさせる; the short continuative し and さし | 規程集 下 p. (32), with its examples 膨らま【し】て and 掛け【さし】て; UniDic 2025.12 させる 連用形 さし |
| Continuative auxiliaries | `rules/continuative.rs` `CONTINUATIVE_AUXILIARIES` | たい, たがる, やがる | 規程集 下 p. (33); UniDic 2025.12 助動詞 たい, たがる, やがる |
| Appearance | `rules/continuative.rs` `APPEARANCE` | そう after a continuative or adjective stem; よさそう, 良さそう, なさそう, 無さそう | ニッポニカ 助動詞; マイペディア 助動詞; UniDic manual §5.3, p. 19 (語幹-サ) |
| I-adjectives | `rules/adjective.rs` | かった, かったら, かったり, ければ, けりゃ, きゃ, かろう, かろ, かろっ; く, くっ and the u-sound form (高う, 美しゅう, たこう) before nothing, て, ちゃ or ない; the stem before そう | UniDic manual §5.3, pp. 19–20; UniDic 2025.12 形容詞, 助動詞 くない, たい 連用形-ウ音便 とう |
| Contractions | `rules/contractions.rs` | てる, でる, とる, どる, とく, どく, てく, でく, ちゃう, じゃう, ちまう, じまう, たげる, たる, てらっしゃる and their voiced forms | 規程集 下 pp. (33)–(34); 最小単位認定規程 1.1, p. 2; UniDic manual §5.2.3, p. 17 |
| Western honorific | `rules/continuative.rs` `WESTERN_HONORIFIC` | はる after the irrealis or continuative stem | 規程集 下 p. (35); UniDic 2025.12 はる |
| Godan する verbs | `rules/godan_suru.rs` | 愛さない, 愛せる traced on from 愛す to 愛する | UniDic 2025.12 (愛す, 訳す and 略す have the lemmas 愛する, 訳する and 略する) |
| Classical | `rules/classical.rs` | む and ん (conjecture); adjective き (若き, 美しき) | 規程集 下 p. (35); UniDic 2025.12 文語助動詞-ム, 文語形容詞-ク and -シク 連体形 |
| Colloquial | `rules/colloquial.rs` | る as ん (触ん, 食べん, すん, らん); fused adjective vowels | UniDic manual §5.3, p. 20 (終止形-撥音便, 連体形-撥音便); UniDic 2025.12 形容詞 終止形 (やべえ, すげえ, 高え, ええ), ない (ねえ), たい (てえ) |

## Left to lookup, and how lookup handles it

| Form | Example | What lookup finds |
|---|---|---|
| Subsidiary verbs after the te-form | 食べている, 書いておく, 読んでしまう | the te-form (食べて), then the subsidiary verb |
| すぎる, なさい, ながら | 高すぎる, 寝なさい, 書きながら | the stem (高 → 高い, 寝 → 寝る, 書き → 書く), then the next word |
| やすい, にくい, づらい | 食べやすい | 食べ → 食べる |
| がる, げ, nominal さ | 寒がる, 寂しげ, 高さ | the adjective stem; a dictionary that lists 高さ finds it whole |
| で after ない | 食べないで, 言わないでおく | 食べない, 言わない |
| か after the volitional | 行こっか | 行こっ → 行く |
| な after the dictionary form | 触んな, するな | 触ん → 触る; する |
| ある after the adjective continuative | 高くあります | 高く → 高い |
| ばかり and とする after ん | 泣かんばかり, 去らんとする | 泣かん → 泣く, 去らん → 去る |
| できる after a noun | 勉強できる | 勉強; できる is a verb of its own (UniDic lemma 出来る) |

## Deliberate exclusions

- **The short causative as a verb form.** UniDic lists 書かす, 待たす, 食べさす and their forms under their own lemmas, not under 書く or 食べる, and the 規程集 attributes only the continuatives し and さし to せる and させる. The deinflector therefore undoes only those continuatives (膨らまして, 掛けさして). 待たされる is traced to 待たす, which dictionaries list; 書かされる is traced to 書かす, which most dictionaries do not list.
- **できる as the potential of する.** UniDic gives できる the lemma 出来る, a verb of its own, and lookup finds it.
- **ゆっ as the euphonic stem of ゆく.** The UniDic manual (§5.2.1, p. 17) states that 五段-カ行-ユク has no euphonic forms, and UniDic analyses ゆっ as a form of 言う, 結う or 揺る. The other forms of ゆく are regular godan forms.
- **Historical kana** (思ふ, 書かう, さう, やう, ませう, ゐる) and old kanji forms such as 來. These are spellings, not inflections; text normalization is the place for them.
- **する written 為る.** Rules produce する in kana only.
- **Rare regional auxiliaries**: ちゃる, a western form of てやる, and the Kyoto honorifics やす and しゃる (規程集 下 pp. (32), (33), (36)). They are rare in general text.
- **Dialect and emphatic spellings that UniDic lists**, such as 書けい, なせえ, すりゃあ and the forms of 来る and する in a few dialects. The list is in `fixtures/generate-unidic-cases.cjs`.

## Test oracles

`fixtures/` holds two generated fixtures, each with the script that writes it. They check the rules; they are not sources for them.

- `kamiya-cases.json`, from kamiya-codec 4.16.1 (Unlicense): common verbs and adjectives through their conjugations and auxiliary chains.
- `unidic-cases.json`, from UniDic 2025.12 under its BSD 3-Clause option: every standard conjugated form of a chosen set of words and sampled verbs, and every form of 29 auxiliaries after a word. `fixtures/README.md` names the version and licence.

## Points of uncertainty

- やがる is a suffix in the 規程集 (下 p. (53)) and an auxiliary in UniDic 2025.12. It is undone, following the newer source; lookup would split 言いやがる cleanly either way.
- ん is both the negative ぬ and the conjecture む, so a word in ん is traced back both ways and lookup shows the result named `negative`.
- Godan forms are traced to a する verb only when the stem is one kanji, as in every such pair in UniDic 2025.12; kana spellings such as あいさない are not.
- An unchanged word of the same length outranks a bare stem, so 書きながら shows a dictionary's noun 書き before the verb 書く, and 高すぎる shows the prefix 高 before 高い.
