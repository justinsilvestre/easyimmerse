import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-dTOMcGZu.js";import{n,t as r}from"./clsx-CTwy9ux-.js";import{t as i}from"./jsx-runtime-DeHZSEgm.js";import{_ as a,a as o,d as s,n as c,t as l,v as u}from"./ClickableText-CYEZHPHu.js";import{l as d,o as f,s as p}from"./exampleCues-B6GZngvF.js";import{n as m,r as h,t as g}from"./subtitleBoxStyles-8AGi-M23.js";function _({ref:e,placement:t,appearance:n,children:i}){let a=n&&t===`overlay`?m(n):null;return(0,v.jsxs)(`div`,{ref:e,"data-testid":`subtitle-band`,"data-placement":t,style:a?.backdrop,className:r(`pointer-events-none z-10 flex flex-col`,t===`overlay`?`absolute inset-x-0 bottom-0`:`relative shrink-0`,n&&t===`below`&&`bg-surface`),children:[a&&(0,v.jsx)(`div`,{"aria-hidden":!0,style:a.feather,className:`absolute inset-x-0 bottom-full h-8`}),i]})}var v;function y(){return(y=e((()=>{n(),g(),v=i(),_.__docgenInfo={description:`The band that holds the subtitles and the player controls under them.
Placed below the picture, the band takes rows of its own right under it, on the same surface as the controls.
Placed over the picture, it lies across the picture's lower edge on a backdrop at the opacity the user chose,
which fades in above the subtitles rather than ending in a hard line.
Either backdrop covers the controls' place too, so that no gap opens under the subtitles when the controls fold away.
Without an appearance, as when no subtitles show, it draws no backdrop.`,methods:[],displayName:`SubtitleBand`,props:{ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:``},placement:{required:!0,tsType:{name:`union`,raw:`"below" | "overlay"`,elements:[{name:`literal`,value:`"below"`},{name:`literal`,value:`"overlay"`}]},description:``},appearance:{required:!0,tsType:{name:`union`,raw:`SubtitleAppearance | null`,elements:[{name:`signature`,type:`object`,raw:`{
  /** How opaque the background is, as a whole percentage. */
  backgroundOpacity: number;
  textShadow: (typeof subtitleTextShadows)[number];
  /** An index into \`subtitleTextScales\`. */
  textSizeStep: number;
  textColor: "white" | "yellow" | "black";
}`,signature:{properties:[{key:`backgroundOpacity`,value:{name:`number`,required:!0},description:`How opaque the background is, as a whole percentage.`},{key:`textShadow`,value:{name:`unknown[number]`,raw:`(typeof subtitleTextShadows)[number]`,required:!0}},{key:`textSizeStep`,value:{name:`number`,required:!0},description:"An index into `subtitleTextScales`."},{key:`textColor`,value:{name:`union`,raw:`"white" | "yellow" | "black"`,elements:[{name:`literal`,value:`"white"`},{name:`literal`,value:`"yellow"`},{name:`literal`,value:`"black"`}],required:!0}}]}},{name:`null`}]},description:``},children:{required:!0,tsType:{name:`ReactNode`},description:``}}}})))()}function b(e){let t=(0,x.useRef)(null),n=(0,x.useRef)(!1);return(0,x.useLayoutEffect)(()=>{let r=t.current,i=document.activeElement===null||document.activeElement===document.body;n.current&&i&&e!==void 0&&r?.querySelector(`[${a}]`)?.focus({preventScroll:!0})},[e]),{ref:t,onFocus:()=>{n.current=!0},onBlur:e=>{if(e.currentTarget.contains(e.relatedTarget))return;let t=e.target;queueMicrotask(()=>{t.isConnected&&(n.current=!1)})}}}var x;function S(){return(S=e((()=>{x=t(),u()})))()}var C,w,T;function E(){return(E=e((()=>{C=t(),c(),g(),S(),w=i(),T=(0,C.memo)(function({targetCue:e,translationCue:t,display:n,appearance:r,flashcardWordRanges:i,activeWord:a,cursor:c,wordGestures:u,onCueStep:m}){let g=b(e?.index),_=n!==`translation`,v=n!==`target`,y=h(r,{target:_?2:0,translation:+!!v});return(0,w.jsxs)(`div`,{"data-testid":`subtitle-box`,style:y.box,className:`pointer-events-auto flex cursor-auto flex-col items-center justify-end px-4 text-center`,children:[_&&e&&(0,w.jsx)(`p`,{style:y.target,className:`font-medium`,...g,onKeyDown:t=>{let n=s(t);n!==null&&m&&(t.preventDefault(),m(e,n))},children:(0,w.jsx)(l,{text:o(e.text),activeWord:f(a,e),cursor:d(c,e),markedRanges:i,gestures:p(u,e)},e.index)}),v&&t&&(0,w.jsx)(`p`,{style:y.translation,className:`whitespace-pre-line opacity-90`,children:o(t.text)})]})}),T.__docgenInfo={description:`The subtitles of the media screen, in a clear box across the whole width of the stage,
with the words of the target language ready to be looked up. \`SubtitleBand\` draws the backdrop behind it.
The box keeps room for two lines of the target language and one of the translation, or only those the display shows,
so that its height stays the same from cue to cue.
The text sits at the foot of the box, so that a cue longer than that room grows upward over the picture rather than over the controls.
The player places it, above its controls, inside a stage that is a CSS container:
the text grows with the stage's width, so that the words are easy to aim at on a large screen.
The whole box takes the pointer, so that a pointer moving over it on the way to a word stays on the subtitles.
From a focused word, Left and Right move the lookup cursor along the cue and Up and Down move to the previous or next cue;
focus stays in the subtitles when the cue changes under it.
It renders again only when its props change, so \`wordGestures\` and \`onCueStep\` must keep their identity across renders.`,methods:[],displayName:`SubtitleOverlay`,props:{targetCue:{required:!0,tsType:{name:`union`,raw:`Cue | null`,elements:[{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},{name:`null`}]},description:``},translationCue:{required:!0,tsType:{name:`union`,raw:`Cue | null`,elements:[{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},{name:`null`}]},description:``},display:{required:!0,tsType:{name:`union`,raw:`"both" | "target" | "translation"`,elements:[{name:`literal`,value:`"both"`},{name:`literal`,value:`"target"`},{name:`literal`,value:`"translation"`}]},description:``},appearance:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  /** How opaque the background is, as a whole percentage. */
  backgroundOpacity: number;
  textShadow: (typeof subtitleTextShadows)[number];
  /** An index into \`subtitleTextScales\`. */
  textSizeStep: number;
  textColor: "white" | "yellow" | "black";
}`,signature:{properties:[{key:`backgroundOpacity`,value:{name:`number`,required:!0},description:`How opaque the background is, as a whole percentage.`},{key:`textShadow`,value:{name:`unknown[number]`,raw:`(typeof subtitleTextShadows)[number]`,required:!0}},{key:`textSizeStep`,value:{name:`number`,required:!0},description:"An index into `subtitleTextScales`."},{key:`textColor`,value:{name:`union`,raw:`"white" | "yellow" | "black"`,elements:[{name:`literal`,value:`"white"`},{name:`literal`,value:`"yellow"`},{name:`literal`,value:`"black"`}],required:!0}}]}},description:``},flashcardWordRanges:{required:!1,tsType:{name:`unknown`},description:`Where the target cue's text holds the words that flashcards were made from.`},activeWord:{required:!1,tsType:{name:`intersection`,raw:`ActiveWord & { cueIndex: number }`,elements:[{name:`signature`,type:`object`,raw:`{
  start: number;
  /** How much of the text the lookup matched, which a run written without spaces highlights. */
  length?: number;
  popupId: string;
  /** False while a lookup cursor lies in another text, whose highlight takes the place of this word's. */
  isHighlighted?: boolean;
}`,signature:{properties:[{key:`start`,value:{name:`number`,required:!0}},{key:`length`,value:{name:`number`,required:!1},description:`How much of the text the lookup matched, which a run written without spaces highlights.`},{key:`popupId`,value:{name:`string`,required:!0}},{key:`isHighlighted`,value:{name:`boolean`,required:!1},description:`False while a lookup cursor lies in another text, whose highlight takes the place of this word's.`}]}},{name:`signature`,type:`object`,raw:`{ cueIndex: number }`,signature:{properties:[{key:`cueIndex`,value:{name:`number`,required:!0}}]}}]},description:``},cursor:{required:!1,tsType:{name:`union`,raw:`CueTextCursor | null`,elements:[{name:`intersection`,raw:`TextCursor & { cueIndex: number }`,elements:[{name:`signature`,type:`object`,raw:`{
  /** The offset the cursor points at, in UTF-16 code units. */
  start: number;
  /** What placed the cursor, which alone can take it away again. */
  input: WordHit["input"];
  /**
   * How much of the text the lookup from \`start\` matched, or null when it matched nothing.
   * It is unset until that lookup answers; meanwhile the cursor highlights the word or character it lies on.
   */
  matchedLength?: number | null;
}`,signature:{properties:[{key:`start`,value:{name:`number`,required:!0},description:`The offset the cursor points at, in UTF-16 code units.`},{key:`input`,value:{name:`union`,raw:`WordHit["input"]`,required:!0},description:`What placed the cursor, which alone can take it away again.`},{key:`matchedLength`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!1},description:"How much of the text the lookup from `start` matched, or null when it matched nothing.\nIt is unset until that lookup answers; meanwhile the cursor highlights the word or character it lies on."}]}},{name:`signature`,type:`object`,raw:`{ cueIndex: number }`,signature:{properties:[{key:`cueIndex`,value:{name:`number`,required:!0}}]}}]},{name:`null`}]},description:`The lookup cursor of the subtitles, highlighted when it lies in the target cue; null when there is none.`},wordGestures:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  onWordClick?: CueWordHandler;
  onWordDoubleClick?: CueWordHandler;
  onWordPointed?: (
    hit: WordHit | null,
    input: WordHit["input"],
    cue: Cue,
  ) => void;
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
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onWordPointed`,value:{name:`signature`,type:`function`,raw:`(
  hit: WordHit | null,
  input: WordHit["input"],
  cue: Cue,
) => void`,signature:{arguments:[{type:{name:`union`,raw:`WordHit | null`,elements:[{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},{name:`null`}]},name:`hit`},{type:{name:`union`,raw:`WordHit["input"]`},name:`input`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onWordHover`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit, cue: Cue) => void | Promise<number | null>`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
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
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}}]}},description:``},onCueStep:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(cue: Cue, step: LineStep) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`},{type:{name:`union`,raw:`"previous" | "next"`,elements:[{name:`literal`,value:`"previous"`},{name:`literal`,value:`"next"`}]},name:`step`}],return:{name:`void`}}},description:`Moves to the previous or next cue, on Up or Down while a word of the target cue has focus.`}}}})))()}export{y as i,E as n,_ as r,T as t};