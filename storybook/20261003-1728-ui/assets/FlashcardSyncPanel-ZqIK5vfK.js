import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./Badge-Cyv36XAv.js";import{n as i,t as a}from"./Button-BGoles7M.js";import{n as o,t as s}from"./createLucideIcon-DwtUTkY6.js";import{n as c,t as l}from"./download-uEp_-0yj.js";import{n as u,t as d}from"./FlashcardPreview-BKwokLJf.js";var f,p;function m(){return(m=e((()=>{o(),f={name:`graduation-cap`,size:24,node:[[`path`,{d:`M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z`,key:`j76jl0`}],[`path`,{d:`M22 10v6`,key:`1lu8f3`}],[`path`,{d:`M6 12.5V16a6 3 0 0 0 12 0v-3.5`,key:`1r8lef`}]]},f.node,p=s(f)})))()}var h,g;function _(){return(_=e((()=>{o(),h={name:`plug`,size:24,node:[[`path`,{d:`M12 22v-5`,key:`1ega77`}],[`path`,{d:`M15 8V2`,key:`18g5xt`}],[`path`,{d:`M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z`,key:`1xoxul`}],[`path`,{d:`M9 8V2`,key:`14iosj`}]]},h.node,g=s(h)})))()}var v,y;function b(){return(b=e((()=>{o(),v={name:`send`,size:24,node:[[`path`,{d:`M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z`,key:`1ffxy3`}],[`path`,{d:`m21.854 2.147-10.94 10.939`,key:`12cjpa`}]]},v.node,y=s(v)})))()}function x({state:e,includedFields:t,...n}){return(0,T.jsxs)(`section`,{"aria-label":`Flashcards`,className:`flex flex-col gap-3 rounded-lg border border-line bg-surface p-4`,children:[(0,T.jsx)(`h2`,{className:`font-semibold`,children:`Flashcards`}),e.kind===`notStarted`?(0,T.jsx)(S,{...n}):(0,T.jsxs)(`div`,{className:`grid items-start gap-4 sm:grid-cols-[1fr_14rem]`,children:[(0,T.jsx)(C,{state:e,...n}),e.nextCard?(0,T.jsx)(d,{content:e.nextCard,includedFields:t,compact:!0}):(0,T.jsx)(`p`,{className:`self-center text-center text-sm text-fg-faint`,children:`No flashcards yet`})]})]})}function S(e){return(0,T.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,T.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`Review your flashcards here, or send them to Anki. You can switch later.`}),(0,T.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,T.jsxs)(a,{variant:`primary`,onClick:e.onStartReview,children:[(0,T.jsx)(p,{className:`size-4`,"aria-hidden":!0}),`Review in easyImmerse`]}),(0,T.jsxs)(a,{onClick:e.onExportPackage,children:[(0,T.jsx)(l,{className:`size-4`,"aria-hidden":!0}),`Export an Anki deck`]}),(0,T.jsxs)(a,{onClick:e.onSetUpAnkiConnect,children:[(0,T.jsx)(g,{className:`size-4`,"aria-hidden":!0}),`Set up AnkiConnect`]})]})]})}function C({state:e,...t}){switch(e.kind){case`review`:return(0,T.jsx)(w,{summary:e.dueCount===0?`Nothing due for review.`:`${e.dueCount} cards due for review.`,action:(0,T.jsxs)(a,{variant:`primary`,onClick:t.onStartReview,children:[(0,T.jsx)(p,{className:`size-4`,"aria-hidden":!0}),`Continue reviewing`]})});case`ankiPackage`:return(0,T.jsx)(w,{summary:e.unexportedCount===0?`Every flashcard has been exported.`:`${e.unexportedCount} new flashcards since the last export.`,action:(0,T.jsxs)(a,{variant:`primary`,disabled:e.unexportedCount===0,onClick:t.onExportPackage,children:[(0,T.jsx)(l,{className:`size-4`,"aria-hidden":!0}),`Export the new cards`]})});case`ankiConnect`:return(0,T.jsx)(w,{badge:e.connection===`connected`?(0,T.jsx)(r,{tone:`success`,children:`Anki connected`}):(0,T.jsx)(r,{tone:`danger`,children:`Anki unreachable`}),summary:e.unsentCount===0?`Every flashcard is in Anki.`:`${e.unsentCount} flashcards waiting to be sent.`,hint:e.connection===`unreachable`?`Start Anki with the AnkiConnect add-on installed. Cards are sent as soon as it answers.`:void 0,action:(0,T.jsxs)(a,{variant:`primary`,disabled:e.unsentCount===0||e.connection===`unreachable`,onClick:t.onSendToAnki,children:[(0,T.jsx)(y,{className:`size-4`,"aria-hidden":!0}),`Send to Anki`]})})}}function w({badge:e,summary:t,hint:n,action:r}){return(0,T.jsxs)(`div`,{className:`flex flex-col items-start gap-2 text-sm`,children:[e,(0,T.jsx)(`p`,{children:t}),n&&(0,T.jsx)(`p`,{className:`text-fg-muted`,children:n}),(0,T.jsx)(`div`,{className:`pt-1`,children:r})]})}var T;function E(){return(E=e((()=>{c(),m(),_(),b(),n(),i(),u(),T=t(),x.__docgenInfo={description:``,methods:[],displayName:`FlashcardSyncPanel`,props:{state:{required:!0,tsType:{name:`union`,raw:`| { kind: "notStarted" }
| { kind: "review"; dueCount: number; nextCard: FlashcardContent | null }
| {
    kind: "ankiPackage";
    unexportedCount: number;
    nextCard: FlashcardContent | null;
  }
| {
    kind: "ankiConnect";
    connection: "connected" | "unreachable";
    unsentCount: number;
    nextCard: FlashcardContent | null;
  }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: "notStarted" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"notStarted"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "review"; dueCount: number; nextCard: FlashcardContent | null }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"review"`,required:!0}},{key:`dueCount`,value:{name:`number`,required:!0}},{key:`nextCard`,value:{name:`union`,raw:`FlashcardContent | null`,elements:[{name:`signature`,type:`object`,raw:`{
  word: string;
  wordPronunciation: string;
  l1Definition: string;
  l2Definition: string;
  textContext: string;
  textContextTranslation: string;
  textContextPronunciation: string;
  audioContext: AudioClip | null;
  screenshot: string | null;
  tags: string[];
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`wordPronunciation`,value:{name:`string`,required:!0}},{key:`l1Definition`,value:{name:`string`,required:!0}},{key:`l2Definition`,value:{name:`string`,required:!0}},{key:`textContext`,value:{name:`string`,required:!0}},{key:`textContextTranslation`,value:{name:`string`,required:!0}},{key:`textContextPronunciation`,value:{name:`string`,required:!0}},{key:`audioContext`,value:{name:`union`,raw:`AudioClip | null`,elements:[{name:`signature`,type:`object`,raw:`{ startMs: number; endMs: number }`,signature:{properties:[{key:`startMs`,value:{name:`number`,required:!0}},{key:`endMs`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0}},{key:`screenshot`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}},{key:`tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!0}}]}},{name:`null`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  kind: "ankiPackage";
  unexportedCount: number;
  nextCard: FlashcardContent | null;
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"ankiPackage"`,required:!0}},{key:`unexportedCount`,value:{name:`number`,required:!0}},{key:`nextCard`,value:{name:`union`,raw:`FlashcardContent | null`,elements:[{name:`signature`,type:`object`,raw:`{
  word: string;
  wordPronunciation: string;
  l1Definition: string;
  l2Definition: string;
  textContext: string;
  textContextTranslation: string;
  textContextPronunciation: string;
  audioContext: AudioClip | null;
  screenshot: string | null;
  tags: string[];
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`wordPronunciation`,value:{name:`string`,required:!0}},{key:`l1Definition`,value:{name:`string`,required:!0}},{key:`l2Definition`,value:{name:`string`,required:!0}},{key:`textContext`,value:{name:`string`,required:!0}},{key:`textContextTranslation`,value:{name:`string`,required:!0}},{key:`textContextPronunciation`,value:{name:`string`,required:!0}},{key:`audioContext`,value:{name:`union`,raw:`AudioClip | null`,elements:[{name:`signature`,type:`object`,raw:`{ startMs: number; endMs: number }`,signature:{properties:[{key:`startMs`,value:{name:`number`,required:!0}},{key:`endMs`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0}},{key:`screenshot`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}},{key:`tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!0}}]}},{name:`null`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  kind: "ankiConnect";
  connection: "connected" | "unreachable";
  unsentCount: number;
  nextCard: FlashcardContent | null;
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"ankiConnect"`,required:!0}},{key:`connection`,value:{name:`union`,raw:`"connected" | "unreachable"`,elements:[{name:`literal`,value:`"connected"`},{name:`literal`,value:`"unreachable"`}],required:!0}},{key:`unsentCount`,value:{name:`number`,required:!0}},{key:`nextCard`,value:{name:`union`,raw:`FlashcardContent | null`,elements:[{name:`signature`,type:`object`,raw:`{
  word: string;
  wordPronunciation: string;
  l1Definition: string;
  l2Definition: string;
  textContext: string;
  textContextTranslation: string;
  textContextPronunciation: string;
  audioContext: AudioClip | null;
  screenshot: string | null;
  tags: string[];
}`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`wordPronunciation`,value:{name:`string`,required:!0}},{key:`l1Definition`,value:{name:`string`,required:!0}},{key:`l2Definition`,value:{name:`string`,required:!0}},{key:`textContext`,value:{name:`string`,required:!0}},{key:`textContextTranslation`,value:{name:`string`,required:!0}},{key:`textContextPronunciation`,value:{name:`string`,required:!0}},{key:`audioContext`,value:{name:`union`,raw:`AudioClip | null`,elements:[{name:`signature`,type:`object`,raw:`{ startMs: number; endMs: number }`,signature:{properties:[{key:`startMs`,value:{name:`number`,required:!0}},{key:`endMs`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0}},{key:`screenshot`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}},{key:`tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!0}}]}},{name:`null`}],required:!0}}]}}]},description:``},includedFields:{required:!0,tsType:{name:`unknown`},description:``},onExportPackage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onSetUpAnkiConnect:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onStartReview:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onSendToAnki:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}export{E as n,x as t};