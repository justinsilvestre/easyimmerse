import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-CMbUpGAN.js";import{n,t as r}from"./clsx-CTwy9ux-.js";import{t as i}from"./jsx-runtime-DeHZSEgm.js";import{ot as a,t as o}from"./src-CYC-FjQy.js";import{i as s,n as c,t as l}from"./cueWordGestures-D2o-M8ai.js";import{c as u,s as d}from"./wordClickMemoryContext-e7rcQaHm.js";import{f,n as p,t as m}from"./ClickableText-Dj8NiXsU.js";import{n as h,r as g,t as _}from"./subtitleBoxStyles-8AGi-M23.js";function v({ref:e,placement:t,appearance:n,controlsHeight:i,children:a}){let o=t===`overlay`,s=n&&o?h(n):null;return(0,y.jsxs)(`div`,{ref:e,"data-testid":`subtitle-band`,"data-placement":t,style:{...s?.backdrop,bottom:o?i:void 0},className:r(`pointer-events-none z-10 flex flex-col`,o?`absolute inset-x-0`:`relative shrink-0`,n&&!o&&`bg-black`),children:[s&&(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(`div`,{"aria-hidden":!0,style:s.feather,className:`absolute inset-x-0 bottom-full h-8`}),(0,y.jsx)(`div`,{"aria-hidden":!0,"data-testid":`subtitle-band-foot`,style:{...s.backdrop,height:i},className:`absolute inset-x-0 top-full`})]}),a]})}var y;function b(){return(b=e((()=>{n(),_(),y=i(),v.__docgenInfo={description:`The band that holds the subtitles, above the player controls at the bottom of the stage.
Placed below the picture, the band takes rows of its own right under it, on black like the video.
Placed over the picture, it lies across the picture's lower edge, above the controls, on a backdrop at the opacity the user chose,
which fades in above the subtitles rather than ending in a hard line
and reaches down behind the controls, so that no gap opens under the subtitles when the controls fold away.
Without an appearance, as when no subtitles show, it draws no backdrop.`,methods:[],displayName:`SubtitleBand`,props:{ref:{required:!1,tsType:{name:`Ref`,elements:[{name:`HTMLDivElement`}],raw:`Ref<HTMLDivElement>`},description:``},placement:{required:!0,tsType:{name:`union`,raw:`"below" | "overlay"`,elements:[{name:`literal`,value:`"below"`},{name:`literal`,value:`"overlay"`}]},description:``},appearance:{required:!0,tsType:{name:`union`,raw:`SubtitleAppearance | null`,elements:[{name:`signature`,type:`object`,raw:`{
  /** How opaque the background is, as a whole percentage. */
  backgroundOpacity: number;
  textShadow: (typeof subtitleTextShadows)[number];
  /** An index into \`subtitleTextScales\`. */
  textSizeStep: number;
  textColor: "white" | "yellow" | "black";
}`,signature:{properties:[{key:`backgroundOpacity`,value:{name:`number`,required:!0},description:`How opaque the background is, as a whole percentage.`},{key:`textShadow`,value:{name:`unknown[number]`,raw:`(typeof subtitleTextShadows)[number]`,required:!0}},{key:`textSizeStep`,value:{name:`number`,required:!0},description:"An index into `subtitleTextScales`."},{key:`textColor`,value:{name:`union`,raw:`"white" | "yellow" | "black"`,elements:[{name:`literal`,value:`"white"`},{name:`literal`,value:`"yellow"`},{name:`literal`,value:`"black"`}],required:!0}}]}},{name:`null`}]},description:``},controlsHeight:{required:!0,tsType:{name:`number`},description:`The height of the controls under the band, which it rises above when it lies over the picture.`},children:{required:!0,tsType:{name:`ReactNode`},description:``}}}})))()}function x(e){let t=(0,S.useRef)(null),n=(0,S.useRef)(!1);return(0,S.useLayoutEffect)(()=>{let r=t.current,i=document.activeElement===null||document.activeElement===document.body;n.current&&i&&e!==void 0&&r?.querySelector(`[${d}]`)?.focus({preventScroll:!0})},[e]),{ref:t,onFocus:()=>{n.current=!0},onBlur:e=>{if(e.currentTarget.contains(e.relatedTarget))return;let t=e.target;queueMicrotask(()=>{t.isConnected&&(n.current=!1)})}}}var S;function C(){return(C=e((()=>{S=t(),u()})))()}var w,T,E;function D(){return(D=e((()=>{o(),w=t(),_(),p(),C(),T=i(),E=(0,w.memo)(function({targetCue:e,translationCue:t,display:n,appearance:r,flashcardWordRanges:i,markedTitle:o,words:u,activeWord:d,cursor:p,wordGestures:h,onCueStep:_}){let v=x(e?.index),y=n!==`translation`,b=n!==`target`,S=g(r,{target:y?2:0,translation:+!!b});return(0,T.jsxs)(`div`,{"data-testid":`subtitle-box`,style:S.box,className:`pointer-events-auto flex cursor-auto flex-col items-center justify-end px-4 text-center`,children:[y&&e&&(0,T.jsx)(`p`,{style:S.target,className:`font-medium`,...v,onKeyDown:t=>{let n=f(t);n!==null&&_&&(t.preventDefault(),_(e,n))},children:(0,T.jsx)(m,{text:a(e.text),activeWord:l(d,e),cursor:s(p,e),markedRanges:i,markedTitle:o,words:u,gestures:c(h,e)},e.index)}),b&&t&&(0,T.jsx)(`p`,{style:S.translation,className:`whitespace-pre-line opacity-90`,children:a(t.text)})]})}),E.__docgenInfo={description:`The subtitles of the media screen, in a clear box across the whole width of the stage,
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
}`,signature:{properties:[{key:`backgroundOpacity`,value:{name:`number`,required:!0},description:`How opaque the background is, as a whole percentage.`},{key:`textShadow`,value:{name:`unknown[number]`,raw:`(typeof subtitleTextShadows)[number]`,required:!0}},{key:`textSizeStep`,value:{name:`number`,required:!0},description:"An index into `subtitleTextScales`."},{key:`textColor`,value:{name:`union`,raw:`"white" | "yellow" | "black"`,elements:[{name:`literal`,value:`"white"`},{name:`literal`,value:`"yellow"`},{name:`literal`,value:`"black"`}],required:!0}}]}},description:``},flashcardWordRanges:{required:!1,tsType:{name:`unknown`},description:`Where the target cue's text holds the words that flashcards were made from.`},markedTitle:{required:!1,tsType:{name:`string`},description:"What hovering a word in `flashcardWordRanges` tells about it, as `ClickableText` describes."},words:{required:!1,tsType:{name:`unknown`},description:`The only words of the target cue to make clickable, as a library item stores them; unset to find them in its text.`},activeWord:{required:!1,tsType:{name:`intersection`,raw:`ActiveWord & { cueIndex: number }`,elements:[{name:`signature`,type:`object`,raw:`{
  start: number;
  /**
   * How much of the text the lookup matched, which a run written without spaces highlights, or null when it matched nothing.
   * Unset while the lookup has not answered, when the word is not highlighted.
   */
  length?: number | null;
  popupId: string;
  /** False while a lookup cursor lies in another text, whose highlight takes the place of this word's. */
  isHighlighted?: boolean;
}`,signature:{properties:[{key:`start`,value:{name:`number`,required:!0}},{key:`length`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!1},description:`How much of the text the lookup matched, which a run written without spaces highlights, or null when it matched nothing.
Unset while the lookup has not answered, when the word is not highlighted.`},{key:`popupId`,value:{name:`string`,required:!0}},{key:`isHighlighted`,value:{name:`boolean`,required:!1},description:`False while a lookup cursor lies in another text, whose highlight takes the place of this word's.`}]}},{name:`signature`,type:`object`,raw:`{ cueIndex: number }`,signature:{properties:[{key:`cueIndex`,value:{name:`number`,required:!0}}]}}]},description:``},cursor:{required:!1,tsType:{name:`union`,raw:`CueTextCursor | null`,elements:[{name:`intersection`,raw:`TextCursor & { cueIndex: number }`,elements:[{name:`signature`,type:`object`,raw:`{
  /** The offset the cursor points at, in UTF-16 code units. */
  start: number;
  /** What placed the cursor, which alone can take it away again. */
  input: WordInput;
  /**
   * How much of the text the lookup from \`start\` matched, or null when it matched nothing.
   * It is unset until that lookup's answer is known, from the cache at once or when the lookup answers; meanwhile nothing is highlighted.
   */
  matchedLength?: number | null;
}`,signature:{properties:[{key:`start`,value:{name:`number`,required:!0},description:`The offset the cursor points at, in UTF-16 code units.`},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0},description:`What placed the cursor, which alone can take it away again.`},{key:`matchedLength`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!1},description:"How much of the text the lookup from `start` matched, or null when it matched nothing.\nIt is unset until that lookup's answer is known, from the cache at once or when the lookup answers; meanwhile nothing is highlighted."}]}},{name:`signature`,type:`object`,raw:`{ cueIndex: number }`,signature:{properties:[{key:`cueIndex`,value:{name:`number`,required:!0}}]}}]},{name:`null`}]},description:`The lookup cursor of the subtitles, highlighted when it lies in the target cue; null when there is none.`},wordGestures:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  onWordClick?: CueWordHandler;
  onWordDoubleClick?: CueWordHandler;
  onWordPointed?: (
    hit: WordHit | null,
    input: WordHit["input"],
    cue: Cue,
  ) => void;
  onWordHover?: CueWordHandler;
  lookUpMatchedLength?: (
    hit: WordHit,
    cue: Cue,
  ) => Promise<number | null> | null;
  onWordHold?: CueWordHandler;
  onWordMouseHold?: CueWordHandler;
  onTextSelect?: (selection: TextSelection, cue: Cue) => void;
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
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},{name:`null`}]},name:`hit`},{type:{name:`union`,raw:`WordHit["input"]`},name:`input`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onWordHover`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit, cue: Cue) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`lookUpMatchedLength`,value:{name:`signature`,type:`function`,raw:`(
  hit: WordHit,
  cue: Cue,
) => Promise<number | null> | null`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`union`,raw:`Promise<number | null> | null`,elements:[{name:`Promise`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]}],raw:`Promise<number | null>`},{name:`null`}]}},required:!1}},{key:`onWordHold`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit, cue: Cue) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onWordMouseHold`,value:{name:`signature`,type:`function`,raw:`(hit: WordHit, cue: Cue) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  word: string;
  /** The word's offset in its text, in UTF-16 code units. */
  start: number;
  element: HTMLElement;
  input: "mouse" | "touch" | "keyboard";
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0},description:`The word's offset in its text, in UTF-16 code units.`},{key:`element`,value:{name:`HTMLElement`,required:!0}},{key:`input`,value:{name:`union`,raw:`"mouse" | "touch" | "keyboard"`,elements:[{name:`literal`,value:`"mouse"`},{name:`literal`,value:`"touch"`},{name:`literal`,value:`"keyboard"`}],required:!0}}]}},name:`hit`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}},{key:`onTextSelect`,value:{name:`signature`,type:`function`,raw:`(selection: TextSelection, cue: Cue) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{
  text: string;
  start: number;
  end: number;
  /** Null where the browser cannot measure the selection. */
  rect: AnchorRect | null;
}`,signature:{properties:[{key:`text`,value:{name:`string`,required:!0}},{key:`start`,value:{name:`number`,required:!0}},{key:`end`,value:{name:`number`,required:!0}},{key:`rect`,value:{name:`union`,raw:`AnchorRect | null`,elements:[{name:`signature`,type:`object`,raw:`{
  top: number;
  bottom: number;
  left: number;
  right: number;
}`,signature:{properties:[{key:`top`,value:{name:`number`,required:!0}},{key:`bottom`,value:{name:`number`,required:!0}},{key:`left`,value:{name:`number`,required:!0}},{key:`right`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0},description:`Null where the browser cannot measure the selection.`}]}},name:`selection`},{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`}],return:{name:`void`}},required:!1}}]}},description:``},onCueStep:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(cue: Cue, step: LineStep) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{ index: number, start_ms: number, end_ms: number, text: string, }`,signature:{properties:[{key:`index`,value:{name:`number`,required:!0}},{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},name:`cue`},{type:{name:`union`,raw:`"previous" | "next"`,elements:[{name:`literal`,value:`"previous"`},{name:`literal`,value:`"next"`}]},name:`step`}],return:{name:`void`}}},description:`Moves to the previous or next cue, on Up or Down while a word of the target cue has focus.`}}}})))()}export{b as i,D as n,v as r,E as t};