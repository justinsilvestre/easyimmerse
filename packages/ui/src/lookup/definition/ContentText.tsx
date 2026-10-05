import type { ReactNode } from "react";
import { ClickableText } from "../../components/ClickableText.tsx";
import { popupWordGestures } from "../popupWordGestures.ts";
import { useWordFlashcard } from "../wordFlashcardContext.ts";
import {
  DefinitionContext,
  useDefinitionContext,
} from "./definitionContext.ts";

/** Renders a run of definition text, with each word clickable unless the text sits inside a `PlainTextScope`. */
export function ContentText({ text }: { text: string }) {
  const { isPlainText, onWordClick } = useDefinitionContext();
  const onWordFlashcard = useWordFlashcard();
  if (isPlainText) return text;
  return (
    <ClickableText
      text={text}
      gestures={popupWordGestures(onWordClick, onWordFlashcard)}
    />
  );
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
