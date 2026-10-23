import { describe, expect, it } from "vitest";
import { pageLanguageOf } from "./pageLanguageOf.ts";

function elementIn(html: string): Element {
  document.body.innerHTML = html;
  const target = document.getElementById("target");
  if (target === null) throw new Error("No target element.");
  return target;
}

const detectGerman = async () => "de";
const detectNothing = async () => null;

describe("pageLanguageOf", () => {
  it("reads the language that the nearest element declares", async () => {
    const element = elementIn('<div lang="ja"><p id="target">犬</p></div>');
    expect(await pageLanguageOf(element, detectGerman)).toBe("ja");
  });

  it("passes over an empty language declaration", async () => {
    const element = elementIn(
      '<div lang="fr"><p id="target" lang="">chien</p></div>',
    );
    expect(await pageLanguageOf(element, detectGerman)).toBe("fr");
  });

  it("detects the language of the text when none is declared", async () => {
    const element = elementIn('<p id="target">Der Hund bellt.</p>');
    expect(await pageLanguageOf(element, detectGerman)).toBe("de");
  });

  it("detects the language from the element's own text", async () => {
    const element = elementIn('<p id="target">Der Hund bellt.</p>');
    const detectedTexts: string[] = [];
    await pageLanguageOf(element, async (text) => {
      detectedTexts.push(text);
      return null;
    });
    expect(detectedTexts).toEqual(["Der Hund bellt."]);
  });

  it("answers an undetermined language when none can be detected", async () => {
    const element = elementIn('<p id="target">123</p>');
    expect(await pageLanguageOf(element, detectNothing)).toBe("und");
  });
});
