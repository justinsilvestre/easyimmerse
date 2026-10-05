// Writes wikidata-cases.json: inflected forms of German lexemes from the Wikidata lexemes dump (CC0),
// each paired with the dictionary form and word class the deinflector should recover,
// as rows of [inflected form, dictionary form, word class].
// Wikidata only serves as an oracle for test cases; the rules cite their own sources.
//
// Lexemes are drawn at random, with a fixed seed, from groups chosen to cover the rule groups:
// strong and weak verbs with and without a particle or prefix, verbs in -eln, -ern and -ieren,
// nouns by plural ending, and adjectives. Every single-word form of a drawn lexeme is kept, except the dictionary form.
// Left out: forms of more than one word (zu gehen, rief an), and verbs whose first part is neither a particle
// nor an inseparable prefix of the lists in particles.rs and opening.rs, which the deinflector does not split.
//
// Download the dump outside the repository, then run this script from the repository root:
//   curl -A easyimmerse-research -o /tmp/latest-lexemes.json.gz https://dumps.wikimedia.org/wikidatawiki/entities/latest-lexemes.json.gz
//   mise exec -- node crates/core/src/deinflection/german/fixtures/generate-wikidata-cases.cjs /tmp/latest-lexemes.json.gz

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const zlib = require("node:zlib");

const GERMAN = "Q188";
const CLASSES = { Q24905: "v", Q1084: "n", Q34698: "adj" };
const NOMINATIVE = "Q131105";
const PLURAL = "Q146786";
const PRETERITE = "Q442485";
const THIRD_PERSON = "Q51929074";
const INDICATIVE = "Q682111";
const SINGULAR = "Q110786";

// The particles and inseparable prefixes that the deinflector splits off, read from its source.
const PARTICLES = quotedStrings(
  path.join(__dirname, "..", "particles.rs"),
  /pub const \w+: &\[&str\] = &\[([^\]]*)\]/g,
);
const PREFIXES = quotedStrings(
  path.join(__dirname, "..", "opening.rs"),
  /INSEPARABLE_PREFIXES: \[&str; \d+\] = \[([^\]]*)\]/g,
);

const VERB_GROUPS = {
  "strong simple": 60,
  "strong prefixed": 40,
  "weak simple": 30,
  "weak prefixed": 25,
  "el-er": 10,
  ieren: 8,
};
const NOUNS_PER_PLURAL_GROUP = 36;
const ADJECTIVES = 80;
// The fewest forms a drawn lexeme must have, so that drawn lexemes come with whole paradigms.
const MIN_FORMS = { v: 20, n: 6, adj: 4 };

async function main(dumpPath) {
  const lexemes = await readGermanLexemes(dumpPath);
  const verbLemmas = new Set(
    lexemes
      .filter((lexeme) => lexeme.wordClass === "v")
      .map((lexeme) => lexeme.lemma),
  );
  const random = seededRandom(20261005);
  const groups = new Map();
  for (const lexeme of lexemes) {
    const group = groupOf(lexeme, verbLemmas);
    if (group) groups.set(group, [...(groups.get(group) ?? []), lexeme]);
  }
  const drawn = [...groups.keys()]
    .sort()
    .flatMap((group) => draw(groups.get(group), sizeOf(group), random));
  const rows = drawn.flatMap(casesOf);
  const output = path.join(__dirname, "wikidata-cases.json");
  fs.writeFileSync(
    output,
    `[\n${rows.map((row) => JSON.stringify(row)).join(",\n")}\n]\n`,
  );
  console.log(`${rows.length} cases from ${drawn.length} lexemes`);
}

async function readGermanLexemes(dumpPath) {
  const lines = readline.createInterface({
    input: fs.createReadStream(dumpPath).pipe(zlib.createGunzip()),
  });
  const lexemes = [];
  for await (const line of lines) {
    if (!line.includes(`"${GERMAN}"`)) continue;
    const entity = JSON.parse(line.trim().replace(/,$/, ""));
    const wordClass = CLASSES[entity.lexicalCategory];
    const lemma = entity.lemmas?.de?.value;
    if (entity.language !== GERMAN || !wordClass || !lemma || !isOneWord(lemma))
      continue;
    const forms = (entity.forms ?? []).map((form) => ({
      text: form.representations?.de?.value,
      features: form.grammaticalFeatures ?? [],
    }));
    lexemes.push({
      id: entity.id,
      lemma,
      wordClass,
      forms: forms.filter((form) => form.text),
    });
  }
  return lexemes.sort(
    (left, right) => Number(left.id.slice(1)) - Number(right.id.slice(1)),
  );
}

function groupOf(lexeme, verbLemmas) {
  if (lexeme.forms.length < MIN_FORMS[lexeme.wordClass]) return null;
  if (lexeme.wordClass === "adj") return "adjective";
  if (lexeme.wordClass === "n")
    return isCapitalized(lexeme.lemma) ? nounGroup(lexeme) : null;
  const opening = verbOpening(lexeme.lemma, verbLemmas);
  if (opening === null) return null;
  if (lexeme.lemma.endsWith("ieren")) return "ieren";
  if (/e[lr]n$/.test(lexeme.lemma)) return "el-er";
  return `${isStrong(lexeme) ? "strong" : "weak"} ${opening ? "prefixed" : "simple"}`;
}

// Whether the verb starts with a particle or prefix (true), with nothing (false), or with an unsupported first part (null).
function verbOpening(lemma, verbLemmas) {
  for (let start = 2; start <= lemma.length - 3; start += 1) {
    if (!verbLemmas.has(lemma.slice(start))) continue;
    return isParticlesAndPrefix(lemma.slice(0, start)) ? true : null;
  }
  return false;
}

function isParticlesAndPrefix(opening) {
  const rests = [
    opening,
    ...PARTICLES.filter((particle) => opening.startsWith(particle)).map((p) =>
      opening.slice(p.length),
    ),
  ];
  const afterTwo = rests.flatMap((rest) => [
    rest,
    ...PARTICLES.filter((p) => rest.startsWith(p)).map((p) =>
      rest.slice(p.length),
    ),
  ]);
  return afterTwo.some((rest) => rest === "" || PREFIXES.includes(rest));
}

function isStrong(lexeme) {
  const past = lexeme.forms.find((form) =>
    [PRETERITE, THIRD_PERSON, INDICATIVE, SINGULAR].every((feature) =>
      form.features.includes(feature),
    ),
  );
  return past !== undefined && !past.text.endsWith("te");
}

function nounGroup(lexeme) {
  const plural = lexeme.forms.find(
    (form) =>
      form.features.includes(NOMINATIVE) && form.features.includes(PLURAL),
  );
  if (!plural) return "noun without plural";
  const { lemma } = lexeme;
  const umlaut =
    removeUmlaut(plural.text) !== plural.text && removeUmlaut(lemma) === lemma
      ? " with umlaut"
      : "";
  const ending = removeUmlaut(plural.text).startsWith(removeUmlaut(lemma))
    ? removeUmlaut(plural.text).slice(lemma.length)
    : "replaced";
  return `noun plural ${ending || "zero"}${umlaut}`;
}

function sizeOf(group) {
  if (group === "adjective") return ADJECTIVES;
  return VERB_GROUPS[group] ?? NOUNS_PER_PLURAL_GROUP;
}

function casesOf(lexeme) {
  const forms = new Set(
    lexeme.forms
      .map((form) => form.text)
      .filter((text) => isOneWord(text) && text !== lexeme.lemma),
  );
  return [...forms].map((form) => [form, lexeme.lemma, lexeme.wordClass]);
}

function draw(items, count, random) {
  const pool = [...items];
  const drawn = [];
  while (drawn.length < count && pool.length > 0) {
    drawn.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return drawn;
}

function quotedStrings(file, listPattern) {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(listPattern)].flatMap((list) =>
    [...list[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]),
  );
}

function isOneWord(text) {
  return /^[\p{L}]+$/u.test(text);
}

function isCapitalized(text) {
  return text[0] !== text[0].toLowerCase();
}

function removeUmlaut(text) {
  return text.replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
}

// A pseudo-random number generator (mulberry32), so that the same dump gives the same cases.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

main(process.argv[2]).catch((error) => {
  console.error(error);
  process.exit(1);
});
