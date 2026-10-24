import { htmlRule } from "./htmlRule.ts";
import {
  drop,
  droppedTags,
  type MarkupLanguage,
  type MarkupRule,
} from "./markupRule.ts";
import { pangoRule } from "./pangoRule.ts";
import { xdxfRule } from "./xdxfRule.ts";

const rules = { html: htmlRule, pango: pangoRule, xdxf: xdxfRule };

/** Decides what an element of dictionary markup stands for, by the rules of its markup language. */
export function markupRuleFor(
  element: Element,
  language: MarkupLanguage,
): MarkupRule {
  const tag = element.localName.toLowerCase();
  return droppedTags.has(tag) ? drop : rules[language](element, tag);
}
