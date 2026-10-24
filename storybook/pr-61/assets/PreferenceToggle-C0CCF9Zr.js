import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-CnheEfB0.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{t as r,yn as i}from"./src-DhWr7l9c.js";import{r as a}from"./preferencesSelectors-1czDA9cZ.js";import{i as o,n as s,r as c,t as l}from"./useAppSelector-QN_Haexj.js";function u({preferenceKey:e,label:t,hint:n}){let r=o(),c=(0,d.useId)(),l=s(a(e))===`true`;return(0,f.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,f.jsxs)(`label`,{className:`flex items-center gap-2 text-sm`,children:[(0,f.jsx)(`input`,{type:`checkbox`,checked:l,"aria-describedby":n===void 0?void 0:c,onChange:()=>r(i.preferenceToggled(e))}),t]}),n!==void 0&&(0,f.jsx)(`p`,{id:c,className:`pl-6 text-xs text-fg-muted`,children:n})]})}var d,f;function p(){return(p=e((()=>{r(),d=t(),c(),l(),f=n(),u.__docgenInfo={description:`A checkbox that switches a true-or-false preference, with an optional hint beneath it.`,methods:[],displayName:`PreferenceToggle`,props:{preferenceKey:{required:!0,tsType:{name:`union`,raw:`| "showTranslations"
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
| "theme"
/** The suggestions the person dismissed, as a JSON array of their ids. */
| "dismissedSuggestions"`,elements:[{name:`literal`,value:`"showTranslations"`},{name:`literal`,value:`"textScale"`},{name:`literal`,value:`"losslessAudio"`},{name:`literal`,value:`"videoQuality"`},{name:`literal`,value:`"showReviewIntervals"`},{name:`literal`,value:`"conversionNoticeDismissed"`},{name:`literal`,value:`"encoderNoticeDismissed"`},{name:`literal`,value:`"readerPreferences"`},{name:`literal`,value:`"subtitleAppearance"`},{name:`literal`,value:`"theme"`},{name:`literal`,value:`"dismissedSuggestions"`}]},description:``},label:{required:!0,tsType:{name:`string`},description:``},hint:{required:!1,tsType:{name:`string`},description:``}}}})))()}export{p as n,u as t};