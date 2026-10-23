import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./circle-alert-BRcAgYwp.js";import{n as i,t as a}from"./clsx-CTwy9ux-.js";function o({label:e,percent:t,className:n}){return(0,s.jsx)(`div`,{role:`progressbar`,"aria-label":e,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":t??void 0,className:a(`h-1.5 overflow-hidden rounded-full bg-surface-strong`,n),children:t===null?(0,s.jsx)(`div`,{className:`h-full w-1/3 animate-progress-slide rounded-full bg-accent`}):(0,s.jsx)(`div`,{className:`h-full rounded-full bg-accent transition-[width]`,style:{width:`${t}%`}})})}var s;function c(){return(c=e((()=>{i(),s=t(),o.__docgenInfo={description:"A bar filled to `percent`, or sliding back and forth while how much is done is unknown.",methods:[],displayName:`ProgressBar`,props:{label:{required:!0,tsType:{name:`string`},description:``},percent:{required:!0,tsType:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},description:`How much is done, from 0 to 100, or null while it is unknown.`},className:{required:!1,tsType:{name:`string`},description:``}}}})))()}function l({activity:e,onOpen:t}){let n=e.status===`running`,r=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(u,{activity:e}),(0,d.jsx)(`span`,{className:`truncate`,children:e.label}),e.status===`running`&&e.percent!==null&&(0,d.jsxs)(`span`,{className:`shrink-0 tabular-nums`,children:[e.percent,`%`]})]}),i=`flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-xs`;return e.opens===null?(0,d.jsx)(`span`,{className:a(i,n?`text-fg-muted`:`bg-danger-soft text-danger-fg`),children:r}):(0,d.jsx)(`button`,{type:`button`,title:e.opens.label,className:a(i,`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`,n?`text-fg-muted hover:bg-surface-muted hover:text-fg`:`bg-danger-soft text-danger-fg hover:bg-danger-line`),onClick:()=>t(e),children:r})}function u({activity:e}){return e.status===`failed`?(0,d.jsx)(r,{"aria-hidden":!0,className:`size-3.5 shrink-0`}):(0,d.jsx)(`span`,{"aria-hidden":!0,className:`w-12 shrink-0`,children:(0,d.jsx)(o,{label:e.label,percent:e.percent})})}var d;function f(){return(f=e((()=>{i(),n(),c(),d=t(),l.__docgenInfo={description:`A compact button for the footer that tells of one activity under way or failed, and opens its place in the app.
An activity with no place shows as the same words without a button.`,methods:[],displayName:`FooterActivityButton`,props:{activity:{required:!0,tsType:{name:`intersection`,raw:`{
  id: string;
  /**
   * What is being done, as a short verb phrase such as "Adding jmdict.zip",
   * or what went wrong, as a short sentence such as "A dictionary could not be added".
   */
  label: string;
  /**
   * The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
   * Null for an activity with no place to show it, which the footer only tells of.
   */
  opens: { step: NavigationStep; label: string } | null;
} & (
  | {
      status: "running";
      /** How much is done, from 0 to 100, or null while it is unknown. */
      percent: number | null;
    }
  | { status: "failed" }
)`,elements:[{name:`signature`,type:`object`,raw:`{
  id: string;
  /**
   * What is being done, as a short verb phrase such as "Adding jmdict.zip",
   * or what went wrong, as a short sentence such as "A dictionary could not be added".
   */
  label: string;
  /**
   * The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
   * Null for an activity with no place to show it, which the footer only tells of.
   */
  opens: { step: NavigationStep; label: string } | null;
}`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`label`,value:{name:`string`,required:!0},description:`What is being done, as a short verb phrase such as "Adding jmdict.zip",
or what went wrong, as a short sentence such as "A dictionary could not be added".`},{key:`opens`,value:{name:`union`,raw:`{ step: NavigationStep; label: string } | null`,elements:[{name:`signature`,type:`object`,raw:`{ step: NavigationStep; label: string }`,signature:{properties:[{key:`step`,value:{name:`union`,raw:`| { type: "openProject"; projectId: string }
| { type: "openProjectSettings"; projectId: string }
| { type: "openReview"; projectId: string }
| { type: "createProject" }
| { type: "continueOffline" }
| { type: "goHome" }
| { type: "openSettings" }
/** Opens the account settings screen, where the app logs in to an account or shows the one it is logged in to. */
| { type: "openAccountSettings" }
/** Opens the general settings page at its Media conversion section, over the main screen, leaving any page above it. */
| { type: "openMediaConversionSettings" }
| { type: "openDictionaries" }
/** Opens the page for pairing with another easyImmerse app on the local network. */
| { type: "openPairing" }
| { type: "closeSettings" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "openProject"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProject"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openProjectSettings"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProjectSettings"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openReview"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openReview"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "createProject" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"createProject"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "continueOffline" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"continueOffline"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "goHome" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"goHome"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openAccountSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openAccountSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openMediaConversionSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openMediaConversionSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openDictionaries" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openDictionaries"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openPairing" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openPairing"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "closeSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"closeSettings"`,required:!0}}]}}],required:!0}},{key:`label`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},description:``},onOpen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(activity: FooterActivity) => void`,signature:{arguments:[{type:{name:`intersection`,raw:`{
  id: string;
  /**
   * What is being done, as a short verb phrase such as "Adding jmdict.zip",
   * or what went wrong, as a short sentence such as "A dictionary could not be added".
   */
  label: string;
  /**
   * The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
   * Null for an activity with no place to show it, which the footer only tells of.
   */
  opens: { step: NavigationStep; label: string } | null;
} & (
  | {
      status: "running";
      /** How much is done, from 0 to 100, or null while it is unknown. */
      percent: number | null;
    }
  | { status: "failed" }
)`,elements:[{name:`signature`,type:`object`,raw:`{
  id: string;
  /**
   * What is being done, as a short verb phrase such as "Adding jmdict.zip",
   * or what went wrong, as a short sentence such as "A dictionary could not be added".
   */
  label: string;
  /**
   * The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
   * Null for an activity with no place to show it, which the footer only tells of.
   */
  opens: { step: NavigationStep; label: string } | null;
}`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`label`,value:{name:`string`,required:!0},description:`What is being done, as a short verb phrase such as "Adding jmdict.zip",
or what went wrong, as a short sentence such as "A dictionary could not be added".`},{key:`opens`,value:{name:`union`,raw:`{ step: NavigationStep; label: string } | null`,elements:[{name:`signature`,type:`object`,raw:`{ step: NavigationStep; label: string }`,signature:{properties:[{key:`step`,value:{name:`union`,raw:`| { type: "openProject"; projectId: string }
| { type: "openProjectSettings"; projectId: string }
| { type: "openReview"; projectId: string }
| { type: "createProject" }
| { type: "continueOffline" }
| { type: "goHome" }
| { type: "openSettings" }
/** Opens the account settings screen, where the app logs in to an account or shows the one it is logged in to. */
| { type: "openAccountSettings" }
/** Opens the general settings page at its Media conversion section, over the main screen, leaving any page above it. */
| { type: "openMediaConversionSettings" }
| { type: "openDictionaries" }
/** Opens the page for pairing with another easyImmerse app on the local network. */
| { type: "openPairing" }
| { type: "closeSettings" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "openProject"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProject"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openProjectSettings"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProjectSettings"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openReview"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openReview"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "createProject" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"createProject"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "continueOffline" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"continueOffline"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "goHome" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"goHome"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openAccountSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openAccountSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openMediaConversionSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openMediaConversionSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openDictionaries" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openDictionaries"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openPairing" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openPairing"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "closeSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"closeSettings"`,required:!0}}]}}],required:!0}},{key:`label`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``}}},u.__docgenInfo={description:`The small bar of a running activity, or the alert sign of a failed one.
Both are hidden from screen readers, since the label beside them says the same and keeps the button's name short.`,methods:[],displayName:`FooterActivityMark`,props:{activity:{required:!0,tsType:{name:`intersection`,raw:`{
  id: string;
  /**
   * What is being done, as a short verb phrase such as "Adding jmdict.zip",
   * or what went wrong, as a short sentence such as "A dictionary could not be added".
   */
  label: string;
  /**
   * The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
   * Null for an activity with no place to show it, which the footer only tells of.
   */
  opens: { step: NavigationStep; label: string } | null;
} & (
  | {
      status: "running";
      /** How much is done, from 0 to 100, or null while it is unknown. */
      percent: number | null;
    }
  | { status: "failed" }
)`,elements:[{name:`signature`,type:`object`,raw:`{
  id: string;
  /**
   * What is being done, as a short verb phrase such as "Adding jmdict.zip",
   * or what went wrong, as a short sentence such as "A dictionary could not be added".
   */
  label: string;
  /**
   * The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
   * Null for an activity with no place to show it, which the footer only tells of.
   */
  opens: { step: NavigationStep; label: string } | null;
}`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`label`,value:{name:`string`,required:!0},description:`What is being done, as a short verb phrase such as "Adding jmdict.zip",
or what went wrong, as a short sentence such as "A dictionary could not be added".`},{key:`opens`,value:{name:`union`,raw:`{ step: NavigationStep; label: string } | null`,elements:[{name:`signature`,type:`object`,raw:`{ step: NavigationStep; label: string }`,signature:{properties:[{key:`step`,value:{name:`union`,raw:`| { type: "openProject"; projectId: string }
| { type: "openProjectSettings"; projectId: string }
| { type: "openReview"; projectId: string }
| { type: "createProject" }
| { type: "continueOffline" }
| { type: "goHome" }
| { type: "openSettings" }
/** Opens the account settings screen, where the app logs in to an account or shows the one it is logged in to. */
| { type: "openAccountSettings" }
/** Opens the general settings page at its Media conversion section, over the main screen, leaving any page above it. */
| { type: "openMediaConversionSettings" }
| { type: "openDictionaries" }
/** Opens the page for pairing with another easyImmerse app on the local network. */
| { type: "openPairing" }
| { type: "closeSettings" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "openProject"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProject"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openProjectSettings"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProjectSettings"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openReview"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openReview"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "createProject" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"createProject"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "continueOffline" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"continueOffline"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "goHome" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"goHome"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openAccountSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openAccountSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openMediaConversionSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openMediaConversionSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openDictionaries" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openDictionaries"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openPairing" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openPairing"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "closeSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"closeSettings"`,required:!0}}]}}],required:!0}},{key:`label`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},description:``}}}})))()}export{c as a,o as i,u as n,f as r,l as t};