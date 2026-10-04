import type { ReactNode } from "react";
import { ClickableText } from "../../components/ClickableText.tsx";
import {
  DefinitionContext,
  useDefinitionContext,
} from "./definitionContext.ts";

/** Renders a run of definition text, with each word clickable unless the text sits inside a `PlainTextScope`. */
export function ContentText({ text }: { text: string }) {
  const { isPlainText, onWordClick } = useDefinitionContext();
  if (isPlainText) return text;
  return <ClickableText text={text} onWordClick={onWordClick} />;
}

/** Renders definition content whose words are not clickable, such as a link's text or a reading above a word. */
export function PlainTextScope({ children }: { children: ReactNode }) {
  const context = useDefinitionContext();
  return (
    <DefinitionContext value={{ ...context, isPlainText: true }}>
      {children}
    </DefinitionContext>
  );
}
