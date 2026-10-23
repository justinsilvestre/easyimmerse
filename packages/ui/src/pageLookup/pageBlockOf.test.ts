import { describe, expect, it } from "vitest";
import { pageBlockOf } from "./pageBlockOf.ts";

function textIn(html: string): Text {
  document.body.innerHTML = html;
  const target = document.getElementById("target");
  if (!(target?.firstChild instanceof Text)) throw new Error("No target text.");
  return target.firstChild;
}

describe("pageBlockOf", () => {
  it("passes over inline elements to the paragraph around them", () => {
    const text = textIn('<p id="block">Der <b><i id="target">Hund</i></b></p>');
    expect(pageBlockOf(text)?.id).toBe("block");
  });

  it("finds the list item around text in it", () => {
    const text = textIn('<ul><li id="target">Hund</li></ul>');
    expect(pageBlockOf(text)?.id).toBe("target");
  });
});
