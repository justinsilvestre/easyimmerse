import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-C0OQmG5s.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{a as r,b as i,i as a,n as o,r as s,t as c,u as l}from"./useAppDispatch-DeeS-o8z.js";function u({preferenceKey:e,label:t,hint:n}){let r=o(),s=(0,d.useId)(),c=a(l(e))===`true`;return(0,f.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,f.jsxs)(`label`,{className:`flex items-center gap-2 text-sm`,children:[(0,f.jsx)(`input`,{type:`checkbox`,checked:c,"aria-describedby":n===void 0?void 0:s,onChange:()=>r(i.preferenceToggled(e))}),t]}),n!==void 0&&(0,f.jsx)(`p`,{id:s,className:`pl-6 text-xs text-fg-muted`,children:n})]})}var d,f;function p(){return(p=e((()=>{r(),d=t(),c(),s(),f=n(),u.__docgenInfo={description:`A checkbox that switches a true-or-false preference, with an optional hint beneath it.`,methods:[],displayName:`PreferenceToggle`,props:{preferenceKey:{required:!0,tsType:{name:`union`,raw:`| "showTranslations"
| "textScale"
| "losslessAudio"
| "conversionNoticeDismissed"
/** The reader's appearance, as JSON. */
| "readerPreferences"
/** How the subtitles over the video look, as JSON. */
| "subtitleAppearance"
/** The theme the user chose: "light", "dark", or anything else for the system's. */
| "theme"`,elements:[{name:`literal`,value:`"showTranslations"`},{name:`literal`,value:`"textScale"`},{name:`literal`,value:`"losslessAudio"`},{name:`literal`,value:`"conversionNoticeDismissed"`},{name:`literal`,value:`"readerPreferences"`},{name:`literal`,value:`"subtitleAppearance"`},{name:`literal`,value:`"theme"`}]},description:``},label:{required:!0,tsType:{name:`string`},description:``},hint:{required:!1,tsType:{name:`string`},description:``}}}})))()}export{p as n,u as t};