import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-D_zaO1uH.js";import{fn as n,t as r}from"./src-__sdOYef.js";import{r as i}from"./preferencesSelectors-CVF7Xauq.js";import{i as a,n as o,r as s,t as c}from"./useAppSelector-27JoB_bR.js";import{t as l}from"./jsx-runtime-DeHZSEgm.js";function u({preferenceKey:e,label:t,hint:r}){let s=a(),c=(0,d.useId)(),l=o(i(e))===`true`;return(0,f.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,f.jsxs)(`label`,{className:`flex items-center gap-2 text-sm`,children:[(0,f.jsx)(`input`,{type:`checkbox`,checked:l,"aria-describedby":r===void 0?void 0:c,onChange:()=>s(n.preferenceToggled(e))}),t]}),r!==void 0&&(0,f.jsx)(`p`,{id:c,className:`pl-6 text-xs text-fg-muted`,children:r})]})}var d,f;function p(){return(p=e((()=>{r(),d=t(),s(),c(),f=l(),u.__docgenInfo={description:`A checkbox that switches a true-or-false preference, with an optional hint beneath it.`,methods:[],displayName:`PreferenceToggle`,props:{preferenceKey:{required:!0,tsType:{name:`union`,raw:`| "showTranslations"
| "textScale"
| "losslessAudio"
/** The quality of converted video: "compact", "balanced", or "best". Balanced when unset. */
| "videoQuality"
/** Whether the review's answer buttons say when each answer would bring the card back. */
| "showReviewIntervals"
| "conversionNoticeDismissed"
/** Whether the desktop app's notice that no video encoder works was put aside, "true" once it was. */
| "encoderNoticeDismissed"
/** The reader's appearance, as JSON. */
| "readerPreferences"
/** How the subtitles over the video look, as JSON. */
| "subtitleAppearance"
/** The theme the user chose: "light", "dark", or anything else for the system's. */
| "theme"`,elements:[{name:`literal`,value:`"showTranslations"`},{name:`literal`,value:`"textScale"`},{name:`literal`,value:`"losslessAudio"`},{name:`literal`,value:`"videoQuality"`},{name:`literal`,value:`"showReviewIntervals"`},{name:`literal`,value:`"conversionNoticeDismissed"`},{name:`literal`,value:`"encoderNoticeDismissed"`},{name:`literal`,value:`"readerPreferences"`},{name:`literal`,value:`"subtitleAppearance"`},{name:`literal`,value:`"theme"`}]},description:``},label:{required:!0,tsType:{name:`string`},description:``},hint:{required:!1,tsType:{name:`string`},description:``}}}})))()}export{p as n,u as t};