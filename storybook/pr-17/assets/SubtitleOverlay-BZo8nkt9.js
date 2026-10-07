import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-BFxhz7lO.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{a as r,n as i,t as a}from"./ClickableText-ld8xxz8b.js";import{o,s}from"./exampleCues-DUIFxIjv.js";import{n as c,t as l}from"./subtitleBoxStyles-G9x0fLNN.js";var u,d,f;function p(){return(p=e((()=>{u=t(),i(),l(),d=n(),f=(0,u.memo)(function({targetCue:e,translationCue:t,display:n,appearance:i,flashcardWordRanges:l,activeWord:u,wordGestures:f}){let p=n!==`translation`,m=n!==`target`,h=c(i,{target:p?2:0,translation:+!!m});return(0,d.jsxs)(`div`,{"data-testid":`subtitle-box`,style:h.box,className:`pointer-events-auto flex cursor-auto flex-col items-center justify-end px-4 text-center`,children:[p&&e&&(0,d.jsx)(`p`,{style:h.target,className:`font-medium`,children:(0,d.jsx)(a,{text:r(e.text),activeWord:o(u,e),markedRanges:l,gestures:s(f,e)})}),m&&t&&(0,d.jsx)(`p`,{style:h.translation,className:`whitespace-pre-line opacity-90`,children:r(t.text)})]})}),f.__docgenInfo={description:`The subtitles drawn over the video, in a box across the whole width of the stage,
with the words of the target language ready to be looked up.
The box keeps room for two lines of the target language and one of the translation, or only those the display shows,
so that its height stays the same from cue to cue.
The text sits at the foot of the box, so that a cue longer than that room grows upward over the picture rather than over the controls.
The player places it, above its controls, inside a stage that is a CSS container:
the text grows with the stage's width, so that the words are easy to aim at on a large screen.
The whole box takes the pointer, so that a pointer moving over it on the way to a word stays on the subtitles.
It renders again only when its props change, so \`wordGestures\` must keep its identity across renders.`,methods:[],displayName:`SubtitleOverlay`,props:{targetCue:{required:!0,tsType:{name:`union`,raw:`Cue | null`,elements:[{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},{name:`null`}]},description:``},translationCue:{required:!0,tsType:{name:`union`,raw:`Cue | null`,elements:[{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},{name:`null`}]},description:``},display:{required:!0,tsType:{name:`union`,raw:`"both" | "target" | "translation"`,elements:[{name:`literal`,value:`"both"`},{name:`literal`,value:`"target"`},{name:`literal`,value:`"translation"`}]},description:``},appearance:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  boxColor: "black" | "grey" | "white";
  /** How opaque the box is, as a whole percentage. */
  boxOpacity: number;
  textShadow: "none" | "soft" | "strong";
  /** An index into \`subtitleTextScales\`. */
  textSizeStep: number;
  textColor: "white" | "yellow" | "black";
}`,signature:{properties:[{key:`boxColor`,value:{name:`union`,raw:`"black" | "grey" | "white"`,elements:[{name:`literal`,value:`"black"`},{name:`literal`,value:`"grey"`},{name:`literal`,value:`"white"`}],required:!0}},{key:`boxOpacity`,value:{name:`number`,required:!0},description:`How opaque the box is, as a whole percentage.`},{key:`textShadow`,value:{name:`union`,raw:`"none" | "soft" | "strong"`,elements:[{name:`literal`,value:`"none"`},{name:`literal`,value:`"soft"`},{name:`literal`,value:`"strong"`}],required:!0}},{key:`textSizeStep`,value:{name:`number`,required:!0},description:"An index into `subtitleTextScales`."},{key:`textColor`,value:{name:`union`,raw:`"white" | "yellow" | "black"`,elements:[{name:`literal`,value:`"white"`},{name:`literal`,value:`"yellow"`},{name:`literal`,value:`"black"`}],required:!0}}]}},description:``},flashcardWordRanges:{required:!1,tsType:{name:`unknown`},description:`Where the target cue's text holds the words that flashcards were made from.`},activeWord:{required:!1,tsType:{name:`signature`,type:`object`,raw:`{
  cueIndex: number;
  start: number;
  /** How much of the cue's text the lookup matched, once it has answered. */
  length?: number;
  popupId: string;
}`,signature:{properties:[{key:`cueIndex`,value:{name:`number`,required:!0}},{key:`start`,value:{name:`number`,required:!0}},{key:`length`,value:{name:`number`,required:!1},description:`How much of the cue's text the lookup matched, once it has answered.`},{key:`popupId`,value:{name:`string`,required:!0}}]}},description:``},wordGestures:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  onWordClick?: CueWordHandler;
  onWordDoubleClick?: CueWordHandler;
  onWordPointed?: (hit: WordHit | null, cue: Cue) => void;
  // A handler with nothing to answer returns nothing, as the other handlers do.
  // biome-ignore lint/suspicious/noConfusingVoidType: see above
  onWordHover?: (hit: WordHit, cue: Cue) => void | Promise<number | null>;
  onWordHoverAnswered?: (
    hit: WordHit,
    matchedLength: number | null,
    cue: Cue,
  ) => void;
  onWordHold?: CueWordHandler;
}`,signature:{properties:[{key:`onWordClick`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit, cue: Cue) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onWordDoubleClick`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit, cue: Cue) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onWordPointed`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit | null, cue: Cue) => void`,signature:{arguments:[{type:{name:`union`,raw:`WordHit | null`,elements:[{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},{name:`null`}]},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onWordHover`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit, cue: Cue) => void | Promise<number | null>`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`union`,raw:`void | Promise<number | null>`,elements:[{name:`void`},{name:`Promise`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]}],raw:`Promise<number | null>`}]}},required:!1}},{key:`onWordHoverAnswered`,value:{name:`signature`,type:`function`,raw:`(
  hit: WordHit,
  matchedLength: number | null,
  cue: Cue,
) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},name:`matchedLength`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onWordHold`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit, cue: Cue) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}}]}},description:``}}}})))()}export{p as n,f as t};