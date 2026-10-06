// Writes unidic-cases.json: conjugated forms listed in 現代書き言葉UniDic ver. 2025.12 (unidic-cwj-202512),
// each paired with the dictionary form and word class the deinflector should recover,
// as rows of [inflected form, dictionary form, word class, UniDic conjugation type and form].
// UniDic is used under the BSD 3-Clause option of its licence; see LICENSE-UniDic and README.md in this folder.
//
// Each case is one conjugated form (活用形) of a word, or of an auxiliary verb after a word,
// followed by what UniDic connects to that form when the form cannot end a word: ない after the irrealis form,
// た after a euphonic form, ば after the hypothetical form, and so on.
// UniDic only serves as an oracle for test cases; the rules cite their own sources.
//
// Download and unzip UniDic outside the repository, then run this script from the repository root:
//   curl -O https://clrd.ninjal.ac.jp/unidic_archive/2512/unidic-cwj-202512.zip
//   unzip unidic-cwj-202512.zip -d /tmp/unidic-cwj-202512
//   mise exec -- node crates/core/src/deinflection/japanese/fixtures/generate-unidic-cases.cjs /tmp/unidic-cwj-202512

const fs = require("node:fs");
const path = require("node:path");

/** Words checked in every conjugated form, as [written base form, conjugation type, dictionary form, word class]. */
const words = [
  ["書く", "五段-カ行", "書く", "v5"],
  ["歩く", "五段-カ行", "歩く", "v5"],
  ["行く", "五段-カ行", "行く", "v5"],
  ["ゆく", "五段-カ行", "ゆく", "v5"],
  ["置く", "五段-カ行", "置く", "v5"],
  ["泳ぐ", "五段-ガ行", "泳ぐ", "v5"],
  ["急ぐ", "五段-ガ行", "急ぐ", "v5"],
  ["話す", "五段-サ行", "話す", "v5"],
  ["出す", "五段-サ行", "出す", "v5"],
  ["愛す", "五段-サ行", "愛する", "vs"],
  ["訳す", "五段-サ行", "訳する", "vs"],
  ["待つ", "五段-タ行", "待つ", "v5"],
  ["持つ", "五段-タ行", "持つ", "v5"],
  ["死ぬ", "五段-ナ行", "死ぬ", "v5"],
  ["遊ぶ", "五段-バ行", "遊ぶ", "v5"],
  ["飛ぶ", "五段-バ行", "飛ぶ", "v5"],
  ["読む", "五段-マ行", "読む", "v5"],
  ["飲む", "五段-マ行", "飲む", "v5"],
  ["帰る", "五段-ラ行", "帰る", "v5"],
  ["分かる", "五段-ラ行", "分かる", "v5"],
  ["知る", "五段-ラ行", "知る", "v5"],
  ["座る", "五段-ラ行", "座る", "v5"],
  ["いらっしゃる", "五段-ラ行", "いらっしゃる", "v5"],
  ["おっしゃる", "五段-ラ行", "おっしゃる", "v5"],
  ["くださる", "五段-ラ行", "くださる", "v5"],
  ["なさる", "五段-ラ行", "なさる", "v5"],
  ["ござる", "五段-ラ行", "ござる", "v5"],
  ["買う", "五段-ワア行", "買う", "v5"],
  ["言う", "五段-ワア行", "言う", "v5"],
  ["思う", "五段-ワア行", "思う", "v5"],
  ["問う", "五段-ワア行", "問う", "v5"],
  ["会う", "五段-ワア行", "会う", "v5"],
  ["もらう", "五段-ワア行", "もらう", "v5"],
  ["見る", "上一段-マ行", "見る", "v1"],
  ["起きる", "上一段-カ行", "起きる", "v1"],
  ["信じる", "上一段-ザ行", "信じる", "v1"],
  ["着る", "上一段-カ行", "着る", "v1"],
  ["借りる", "上一段-ラ行", "借りる", "v1"],
  ["食べる", "下一段-バ行", "食べる", "v1"],
  ["寝る", "下一段-ナ行", "寝る", "v1"],
  ["出る", "下一段-ダ行", "出る", "v1"],
  ["忘れる", "下一段-ラ行", "忘れる", "v1"],
  ["教える", "下一段-ア行", "教える", "v1"],
  ["掛ける", "下一段-カ行", "掛ける", "v1"],
  ["くれる", "下一段-ラ行", "くれる", "v1"],
  ["書ける", "下一段-カ行", "書く", "v5"],
  ["読める", "下一段-マ行", "読む", "v5"],
  ["食べれる", "下一段-ラ行", "食べる", "v1"],
  ["見れる", "下一段-ラ行", "見る", "v1"],
  ["来れる", "下一段-ラ行", "来る", "vk"],
  ["来る", "カ行変格", "来る", "vk"],
  ["くる", "カ行変格", "くる", "vk"],
  ["する", "サ行変格", "する", "vs"],
  ["愛する", "サ行変格", "愛する", "vs"],
  ["論ずる", "サ行変格", "論ずる", "vz"],
  ["信ずる", "サ行変格", "信ずる", "vz"],
  ["高い", "形容詞", "高い", "adj-i"],
  ["安い", "形容詞", "安い", "adj-i"],
  ["若い", "形容詞", "若い", "adj-i"],
  ["寒い", "形容詞", "寒い", "adj-i"],
  ["早い", "形容詞", "早い", "adj-i"],
  ["美しい", "形容詞", "美しい", "adj-i"],
  ["忙しい", "形容詞", "忙しい", "adj-i"],
  ["嬉しい", "形容詞", "嬉しい", "adj-i"],
  ["大きい", "形容詞", "大きい", "adj-i"],
  ["よい", "形容詞", "よい", "adj-i"],
  ["無い", "形容詞", "無い", "adj-i"],
  ["やばい", "形容詞", "やばい", "adj-i"],
  ["すごい", "形容詞", "すごい", "adj-i"],
  ["うるさい", "形容詞", "うるさい", "adj-i"],
  ["ありがたい", "形容詞", "ありがたい", "adj-i"],
  ["若し", "文語形容詞-ク", "若い", "adj-i"],
  ["美し", "文語形容詞-シク", "美しい", "adj-i"],
];

/**
 * Auxiliary verbs checked in every conjugated form after a word,
 * as [written base form, conjugation type, [what comes before it, dictionary form, word class] for each word].
 */
const auxiliaries = [
  [
    "ない",
    "助動詞-ナイ",
    [
      ["書か", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  [
    "たい",
    "助動詞-タイ",
    [
      ["書き", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  [
    "ます",
    "助動詞-マス",
    [
      ["書き", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  [
    "た",
    "助動詞-タ",
    [
      ["書い", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["だ", "助動詞-タ", [["読ん", "読む", "v5"]]],
  [
    "まい",
    "助動詞-マイ",
    [
      ["行く", "行く", "v5"],
      ["見", "見る", "v1"],
    ],
  ],
  [
    "ぬ",
    "助動詞-ヌ",
    [
      ["知ら", "知る", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["ず", "文語助動詞-ズ", [["知ら", "知る", "v5"]]],
  ["む", "文語助動詞-ム", [["行か", "行く", "v5"]]],
  [
    "へん",
    "助動詞-ヘン",
    [
      ["行か", "行く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["ひん", "助動詞-ヒン", [["起き", "起きる", "v1"]]],
  ["れる", "助動詞-レル", [["書か", "書く", "v5"]]],
  ["られる", "助動詞-レル", [["食べ", "食べる", "v1"]]],
  ["せる", "下一段-サ行", [["書か", "書く", "v5"]]],
  ["させる", "下一段-サ行", [["食べ", "食べる", "v1"]]],
  [
    "たがる",
    "五段-ラ行",
    [
      ["書き", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  [
    "やがる",
    "五段-ラ行",
    [
      ["書き", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  [
    "てる",
    "下一段-タ行",
    [
      ["書い", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["でる", "下一段-ダ行", [["読ん", "読む", "v5"]]],
  [
    "とる",
    "五段-ラ行",
    [
      ["書い", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["どる", "五段-ラ行", [["読ん", "読む", "v5"]]],
  [
    "とく",
    "五段-カ行",
    [
      ["書い", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["どく", "五段-カ行", [["読ん", "読む", "v5"]]],
  [
    "てく",
    "五段-カ行",
    [
      ["書い", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["でく", "五段-カ行", [["読ん", "読む", "v5"]]],
  ["たげる", "下一段-ガ行", [["送っ", "送る", "v5"]]],
  ["たる", "五段-ラ行", [["書い", "書く", "v5"]]],
  ["てらっしゃる", "五段-ラ行", [["書い", "書く", "v5"]]],
  [
    "はる",
    "五段-ラ行",
    [
      ["行か", "行く", "v5"],
      ["行き", "行く", "v5"],
    ],
  ],
  [
    "ちゃう",
    "五段-ワア行",
    [
      ["書い", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["じゃう", "五段-ワア行", [["読ん", "読む", "v5"]]],
  [
    "ちまう",
    "五段-ワア行",
    [
      ["書い", "書く", "v5"],
      ["食べ", "食べる", "v1"],
    ],
  ],
  ["じまう", "五段-ワア行", [["読ん", "読む", "v5"]]],
];

/** How many more words of each conjugation type of verb to check, beyond those listed in `words`. */
const SAMPLED_WORDS_PER_TYPE = 3;

/** The conjugation types of verbs that are sampled, by their prefix. */
const SAMPLED_TYPES = ["五段-", "上一段-", "下一段-"];

/**
 * Spellings left out: those with katakana, a long vowel mark, a small vowel, ゝ, historical kana (ふ, ゐ, ゑ)
 * or punctuation. Text normalization, not deinflection, is the place for them.
 */
const UNSUPPORTED_SPELLING = /[ァ-ヶー〜～ぁぃぅぇぉゎゝゐゑふ…、」]/;

/**
 * Conjugated forms left out:
 * - 連用形-省略, 連体形-省略 and 終止形-省略 drop the ending before a particle (落ち(んです)); they are not words.
 * - 終止形-促音便 and 連体形-促音便 (高っ, 書っ) are emphatic clippings.
 * - 連用形-融合 and 未然形-融合 fuse a form with a particle other than ば (行きゃ(あしない), しゃあ).
 * - ク語法, 已然形, 連用形-ニ and the -補助 forms other than ざる are classical forms that modern text does not use.
 * - 終止形-融合 (てらあ, まさあ) and 連体形-ウ音便 (ちょう) are rare dialect forms.
 */
const SKIPPED_FORMS = new Set([
  "連用形-省略",
  "連体形-省略",
  "終止形-省略",
  "終止形-促音便",
  "連体形-促音便",
  "連用形-融合",
  "未然形-融合",
  "ク語法",
  "已然形-一般",
  "已然形-補助",
  "未然形-補助",
  "連用形-補助",
  "終止形-融合",
  "連体形-ウ音便",
  "連用形-ニ",
  "終止形-補助",
]);

/**
 * Forms that UniDic lists but that are dialectal, archaic or emphatic, as patterns on the written form,
 * keyed by the conjugated form they apply to:
 * - a volitional in historical kana (読まう, 見やう) or a dialect contraction (食びょう);
 * - an imperative lengthened for emphasis or in dialect (書けい, なせえ, なさあい, なっせ, くり);
 * - a fused provisional lengthened for emphasis (すりゃあ) or written without small kana (なけりや),
 *   or one that does not end in ゃ or や (言わ).
 */
const NONSTANDARD_SPELLINGS = new Map([
  ["意志推量形", /([あかがさざただなはばぱまやらわ]う|びょう)$/],
  ["命令形", /([えけげせてねべめれ][いえ]|あい|っせ|くり)$/],
  ["仮定形-融合", /(あ|りや|にや|[^ゃや])$/],
]);

/**
 * Individual forms left out, as `written base form/written form`. UniDic lists them, but they are dialect forms
 * that the deinflector does not undo:
 * - forms of auxiliaries: ない's ね, ねへ, ねく, なし, な, なか and なから; ぬ's んく, はっ, やはっ, んきゃ, な and んかろう;
 *   classical ず's ざ; まい's めえ; たげる's たげろう;
 *   たい's たか, たぐ, たあい, て, てい and た; ます's まへ, ま, まん, まっ, ましい, ませい, まあす, まする, まっす, まさ,
 *   ましょお, ましよう, まっしゃろ, まっしゃろう and まひょ; た's たあ and its hypothetical た; へん's へ and へんく, ひん's ひんく;
 * - forms of する and 来る: す, するう, しい, ち, い, しや and しょっ; きや, こえ, こや, これ, こう and きい;
 * - the adjective forms よか, ええっ, えっ, よぐ, すげかっ and すごっく, and the shortened やべ, すげ and うるせ.
 */
const SKIPPED_SPELLINGS = new Set([
  "ない/ね",
  "ない/ねへ",
  "ない/ねく",
  "ない/なし",
  "ない/な",
  "ない/なか",
  "ない/なから",
  "ぬ/んく",
  "ぬ/はっ",
  "ぬ/やはっ",
  "ぬ/んきゃ",
  "ぬ/な",
  "ぬ/んかろう",
  "ず/ざ",
  "まい/めえ",
  "たげる/たげろう",
  "たい/たか",
  "たい/たぐ",
  "たい/たあい",
  "たい/て",
  "たい/てい",
  "たい/た",
  "ます/まへ",
  "ます/ま",
  "ます/まん",
  "ます/まっ",
  "ます/ましい",
  "ます/ませい",
  "ます/まあす",
  "ます/まする",
  "ます/まっす",
  "ます/まさ",
  "ます/ましょお",
  "ます/ましよう",
  "ます/まっしゃろ",
  "ます/まっしゃろう",
  "ます/まひょ",
  "た/たあ",
  "へん/へ",
  "へん/へんく",
  "ひん/ひんく",
  "する/す",
  "する/するう",
  "する/しい",
  "する/ち",
  "する/い",
  "する/しや",
  "する/しょっ",
  "くる/きや",
  "くる/こえ",
  "くる/こや",
  "くる/これ",
  "くる/こう",
  "くる/きい",
  "よい/よか",
  "よい/えっ",
  "よい/よぐ",
  "すごい/すげかっ",
  "すごい/すごっく",
  "やばい/やべ",
  "すごい/すげ",
  "うるさい/うるせ",
]);

/** The forms that differ from a standard one only in a way the patterns above describe, or that UniDic gives for a dialect. */
function isStandard(row) {
  const nonstandard = NONSTANDARD_SPELLINGS.get(row.form);
  return (
    !UNSUPPORTED_SPELLING.test(row.written) &&
    !SKIPPED_FORMS.has(row.form) &&
    !SKIPPED_SPELLINGS.has(`${row.base}/${row.written}`) &&
    !(nonstandard?.test(row.written) && !row.written.endsWith("ましょう")) &&
    !(
      row.type === "助動詞-タ" &&
      row.form === "仮定形-一般" &&
      !row.written.endsWith("ら")
    ) &&
    (!/^(五段|上一段|下一段|カ行変格|サ行変格)/.test(row.type) ||
      isStandardVerbForm(row)) &&
    (!row.type.startsWith("文語助動詞") ||
      isModernClassicalAuxiliaryForm(row)) &&
    (!row.type.startsWith("形容詞") || isStandardAdjectiveForm(row)) &&
    (!row.type.startsWith("文語形容詞") || isClassicalAttributive(row))
  );
}

/**
 * A verb form must keep the stem of the base form, except in the u-sound euphonic form (もろう for もらう)
 * and in the irregular verbs 来る and する. Its plain form is the base form, or ends in ん for a verb in る.
 * Ichidan verbs use the bare stem in the irrealis and continuative, and have no euphonic forms;
 * godan verbs end in the あ or え row in the irrealis, and those in く have the euphonic っ only in 行く.
 */
function isStandardVerbForm({ type, form, written, base }) {
  const stem = base.slice(0, -1);
  const isIchidan = /^(上|下)一段/.test(type);
  if (form === "連用形-ウ音便") {
    return written.endsWith("う") && written.length === base.length;
  }
  if (/変格$/.test(type)) {
    return true;
  }
  if (/^(終止形|連体形)/.test(form)) {
    return form.endsWith("撥音便")
      ? base.endsWith("る") && written === `${stem}ん`
      : written === base;
  }
  if (isIchidan && /^(未然形-一般|連用形-一般)$/.test(form)) {
    return written === stem;
  }
  if (isIchidan && form === "連用形-促音便") {
    return false;
  }
  if (type.startsWith("五段") && form === "連用形-一般") {
    return written.startsWith(stem) && /[いきぎしちにびみり]$/.test(written);
  }
  if (type === "五段-カ行" && form === "連用形-促音便") {
    return /(行|逝|往)く$/.test(base);
  }
  if (type.startsWith("五段") && form === "未然形-一般") {
    return (
      written.length === base.length &&
      written.startsWith(stem) &&
      /[あかがさただなばまらわえけげせてねべめれ]$/.test(written)
    );
  }
  return written.startsWith(stem);
}

/** Of the classical auxiliaries, only the forms still used in modern writing are checked: ず, ぬ, ざる, む and ん. */
function isModernClassicalAuxiliaryForm({ form }) {
  return /^(終止形-一般|連体形-一般|連体形-補助|連体形-撥音便|終止形-撥音便|連用形-一般)$/.test(
    form,
  );
}

/**
 * An adjective form must keep the stem; the continuative ends in く, くっ or う,
 * and the plain form may only fuse its final vowels into え (やべえ, 美しえ).
 */
function isStandardAdjectiveForm({ form, written, base }) {
  const stem = base.slice(0, -1);
  if (/^(終止形|連体形)/.test(form)) {
    return (
      written === base ||
      (written.endsWith("え") && written.length === base.length)
    );
  }
  if (form === "連用形-一般") {
    return /(く|くっ)$/.test(written) && !/っく$/.test(written);
  }
  if (form === "連用形-ウ音便") {
    return written.endsWith("う");
  }
  return written.startsWith(stem) || form === "語幹-サ";
}

/** Of the classical adjectives, only the attributive in き is checked: 若き for 若し, 美しき for 美し. */
function isClassicalAttributive({ type, form, written, base }) {
  const stem = type.endsWith("シク") ? base : base.slice(0, -1);
  return form === "連体形-一般" && written === `${stem}き`;
}

function main() {
  const directory = process.argv[2];
  const rows = readFeatureRows(path.join(directory, "sys.dic"));
  const byBase = groupByBase(rows);
  const cases = uniqueCases([
    ...words.flatMap((word) => wordCases(byBase, word)),
    ...sampledWords(rows).flatMap((word) => wordCases(byBase, word)),
    ...auxiliaries.flatMap((auxiliary) => auxiliaryCases(byBase, auxiliary)),
  ]);
  const output = path.join(__dirname, "unidic-cases.json");
  const lines = cases.map(
    (row) => `  [${row.map((cell) => JSON.stringify(cell)).join(", ")}]`,
  );
  fs.writeFileSync(output, `[\n${lines.join(",\n")}\n]\n`);
  console.log(`Wrote ${cases.length} cases to ${output}`);
}

/**
 * Reads the feature strings of a MeCab system dictionary.
 * The header holds ten little-endian 32-bit numbers and a 32-byte character set name;
 * the NUL-separated features follow the double array and the token table.
 */
function readFeatureRows(file) {
  const buffer = fs.readFileSync(file);
  const doubleArraySize = buffer.readUInt32LE(24);
  const tokenSize = buffer.readUInt32LE(28);
  const featureSize = buffer.readUInt32LE(32);
  const start = 72 + doubleArraySize + tokenSize;
  const text = buffer.toString("utf8", start, start + featureSize);
  return text.split("\0").map(toRow).filter(isConjugated);
}

/** Picks out part of speech, conjugation type and form, lemma, written form and written base form. */
function toRow(feature) {
  const fields = feature.split(",");
  return {
    partOfSpeech: fields[0],
    subclass: fields[1],
    type: fields[4],
    form: fields[5],
    lemma: fields[7],
    written: fields[8],
    base: fields[10],
  };
}

function isConjugated(row) {
  return row.type !== undefined && row.type !== "*";
}

function groupByBase(rows) {
  const byBase = new Map();
  for (const row of rows) {
    const key = `${row.base}\t${row.type}`;
    byBase.set(key, [...(byBase.get(key) ?? []), row]);
  }
  return byBase;
}

/**
 * Picks a few more verbs of each sampled conjugation type: those written as kanji followed by kana
 * whose lemma is their own base form, in the order of their base form.
 */
function sampledWords(rows) {
  const listed = new Set(words.map(([base]) => base));
  const candidates = rows.filter(
    (row) =>
      row.partOfSpeech === "動詞" &&
      row.subclass === "一般" &&
      row.form === "終止形-一般" &&
      row.written === row.base &&
      row.lemma === row.base &&
      /^\p{Script=Han}+\p{Script=Hiragana}+$/u.test(row.base) &&
      !listed.has(row.base) &&
      SAMPLED_TYPES.some((prefix) => row.type.startsWith(prefix)),
  );
  const byType = new Map();
  for (const row of candidates.sort((left, right) =>
    left.base < right.base ? -1 : 1,
  )) {
    const chosen = byType.get(row.type) ?? [];
    if (chosen.length < SAMPLED_WORDS_PER_TYPE && !chosen.includes(row.base)) {
      byType.set(row.type, [...chosen, row.base]);
    }
  }
  return [...byType].flatMap(([type, bases]) =>
    bases.map((base) => [base, type, base, wordClass(type)]),
  );
}

function wordClass(type) {
  return type.startsWith("五段") ? "v5" : "v1";
}

function wordCases(byBase, [base, type, term, wordClass]) {
  return formsOf(byBase, base, type).flatMap((row) =>
    caseFor("", row, term, wordClass),
  );
}

function auxiliaryCases(byBase, [base, type, hosts]) {
  return formsOf(byBase, base, type).flatMap((row) =>
    hosts.flatMap(([before, term, wordClass]) =>
      caseFor(before, row, term, wordClass),
    ),
  );
}

function formsOf(byBase, base, type) {
  return (byBase.get(`${base}\t${type}`) ?? []).filter(isStandard);
}

/** Builds the case for one form, or none when the form is the base form itself. */
function caseFor(before, row, term, wordClass) {
  const after = following(row);
  if (after === undefined) {
    return [];
  }
  const inflected = `${before}${row.written}${after}`;
  if (inflected === term) {
    return [];
  }
  return [[inflected, term, wordClass, `${row.type} ${row.form}`]];
}

/**
 * What follows a form in the test case: nothing when it can end a word, otherwise what UniDic connects to it.
 * Returns undefined for a form that is the base form itself, which needs no case.
 */
function following({ type, form, written, base }) {
  const isAdjectival = /^(形容詞|助動詞-ナイ|助動詞-タイ)/.test(type);
  switch (form.replace(/-.*/, "")) {
    case "未然形":
      return irrealisFollower(type, form, written);
    case "連用形":
      return continuativeFollower(type, form, written, isAdjectival);
    case "終止形":
    case "連体形":
      return written === base && !form.endsWith("撥音便") ? undefined : "";
    case "仮定形":
      return form === "仮定形-一般" ? "ば" : "";
    case "語幹":
      return form === "語幹-サ" ? "そう" : "";
    default:
      return "";
  }
}

function irrealisFollower(type, form, written) {
  if (form === "未然形-セ") {
    return "ず";
  }
  if (form === "未然形-サ") {
    return "れる";
  }
  if (type === "助動詞-マス") {
    return "ん";
  }
  if (type === "助動詞-タ") {
    return "";
  }
  const isWesternIrrealis =
    (type.startsWith("五段") && /[えけげせてねべめれ]$/.test(written)) ||
    (/変格$/.test(type) && /[えお]$/.test(written));
  if (isWesternIrrealis) {
    return "へん";
  }
  return "ない";
}

function continuativeFollower(type, form, written, isAdjectival) {
  if (form === "連用形-促音便" || (form === "連用形-ウ音便" && !isAdjectival)) {
    return "た";
  }
  if (form === "連用形-イ音便") {
    return type === "五段-ガ行" ? "だ" : type === "五段-ラ行" ? "ます" : "た";
  }
  if (form === "連用形-撥音便") {
    return type === "五段-ラ行" ? "" : "だ";
  }
  if (type === "助動詞-マス") {
    return "た";
  }
  if (/^助動詞-(ヘン|ヒン)/.test(type)) {
    return /っ$/.test(written) ? "た" : undefined;
  }
  return "";
}

function uniqueCases(cases) {
  const seen = new Set();
  return cases.filter((testCase) => {
    const key = testCase.slice(0, 3).join("\t");
    const isNew = !seen.has(key);
    seen.add(key);
    return isNew;
  });
}

main();
