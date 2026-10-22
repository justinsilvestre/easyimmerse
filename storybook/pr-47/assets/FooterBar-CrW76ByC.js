import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./createLucideIcon-BymXwl6D.js";import{n as i,t as a}from"./ThemeMenu-DCHRBLAP.js";import{n as o,t as s}from"./settings-DEiFscIx.js";import{n as c,t as l}from"./IconButton-Djpdm6CF.js";import{r as u,t as d}from"./FooterActivityButton-DWFcbWpt.js";import{i as f,n as p,r as m,t as h}from"./FooterActivitiesMenu-DqJ9xTMu.js";var g,_;function v(){return(v=e((()=>{n(),g={name:`wifi`,size:24,node:[[`path`,{d:`M12 20h.01`,key:`zekei9`}],[`path`,{d:`M2 8.82a15 15 0 0 1 20 0`,key:`dnpr2z`}],[`path`,{d:`M5 12.859a10 10 0 0 1 14 0`,key:`1x1e6c`}],[`path`,{d:`M8.5 16.429a5 5 0 0 1 7 0`,key:`1bycff`}]]},g.node,_=r(g)})))()}function y({activities:e,onOpen:t}){return(0,b.jsxs)(`div`,{className:`@container flex min-w-0 flex-1 items-center`,children:[(0,b.jsx)(`span`,{role:`status`,className:`sr-only`,children:m(e)}),e.length<=2&&(0,b.jsx)(`div`,{className:e.length===2?`hidden min-w-0 items-center gap-2 @md:flex`:`flex min-w-0 items-center gap-2`,children:e.map(e=>(0,b.jsx)(d,{activity:e,onOpen:t},e.id))}),e.length>=2&&(0,b.jsx)(h,{activities:e,onOpen:t,className:e.length===2?`@md:hidden`:void 0})]})}var b;function x(){return(x=e((()=>{p(),u(),f(),b=t(),y.__docgenInfo={description:`The activities under way or failed, at the footer's left edge after the fixed controls.
One activity is a button of its own. Two stand side by side where the footer leaves them 28rem,
and fold into one summary button with a menu where it leaves less, as on a phone beside the media screen's toggles;
three or more always fold.
The folding is a container query on this element, so it must be given its share of the footer's width.
A screen reader hears each activity's label when it appears and when it fails, but not its changing percentage.`,methods:[],displayName:`FooterActivities`,props:{activities:{required:!0,tsType:{name:`unknown`},description:``},onOpen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(activity: FooterActivity) => void`,signature:{arguments:[{type:{name:`intersection`,raw:`{
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
/** Opens the general settings page, where the Account section is, over the main screen, leaving any page above it. */
| { type: "openAccountSettings" }
/** Opens the general settings page at its Media conversion section, over the main screen, leaving any page above it. */
| { type: "openMediaConversionSettings" }
| { type: "openDictionaries" }
/** Opens the page for pairing with another easyImmerse app on the local network. */
| { type: "openPairing" }
| { type: "closeSettings" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "openProject"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProject"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openProjectSettings"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProjectSettings"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openReview"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openReview"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "createProject" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"createProject"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "continueOffline" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"continueOffline"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "goHome" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"goHome"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openAccountSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openAccountSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openMediaConversionSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openMediaConversionSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openDictionaries" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openDictionaries"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openPairing" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openPairing"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "closeSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"closeSettings"`,required:!0}}]}}],required:!0}},{key:`label`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``}}}})))()}function S({isSettingsOpen:e,onOpenSettings:t,isPairingOpen:n,onOpenPairing:r,backupSign:i,activities:o,onOpenActivity:c,children:u}){return(0,C.jsx)(`footer`,{className:`sticky bottom-0 border-t border-line bg-surface`,children:(0,C.jsxs)(`div`,{className:`flex items-center justify-between gap-2 px-2 py-0.5`,children:[(0,C.jsxs)(`div`,{className:`flex min-w-0 flex-1 items-center gap-2`,children:[(0,C.jsx)(l,{label:`Settings`,"aria-current":e?`page`:void 0,"aria-disabled":e||void 0,onClick:e?void 0:t,children:(0,C.jsx)(s,{className:`size-4`})}),(0,C.jsx)(l,{label:`Local network sync`,"aria-current":n?`page`:void 0,"aria-disabled":n||void 0,onClick:n?void 0:r,children:(0,C.jsx)(_,{className:`size-4`})}),(0,C.jsx)(a,{}),i,(0,C.jsx)(y,{activities:o,onOpen:c})]}),u&&(0,C.jsx)(`div`,{className:`flex shrink-0 items-center gap-1`,children:u})]})})}var C;function w(){return(w=e((()=>{o(),v(),x(),c(),i(),C=t(),S.__docgenInfo={description:`The thin bar at the bottom of the window, given its state as props: the way to Settings and to local network sync, the theme menu,
a sign of whether the user's work is backed up, and the activities under way at its left edge,
and the screen's own buttons, passed as children, at its right edge.
\`AppFooter\` gives it its state from the store.`,methods:[],displayName:`FooterBar`,props:{isSettingsOpen:{required:!0,tsType:{name:`boolean`},description:``},onOpenSettings:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},isPairingOpen:{required:!0,tsType:{name:`boolean`},description:``},onOpenPairing:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},backupSign:{required:!1,tsType:{name:`ReactNode`},description:``},activities:{required:!0,tsType:{name:`unknown`},description:``},onOpenActivity:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(activity: FooterActivity) => void`,signature:{arguments:[{type:{name:`intersection`,raw:`{
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
/** Opens the general settings page, where the Account section is, over the main screen, leaving any page above it. */
| { type: "openAccountSettings" }
/** Opens the general settings page at its Media conversion section, over the main screen, leaving any page above it. */
| { type: "openMediaConversionSettings" }
| { type: "openDictionaries" }
/** Opens the page for pairing with another easyImmerse app on the local network. */
| { type: "openPairing" }
| { type: "closeSettings" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "openProject"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProject"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openProjectSettings"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProjectSettings"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openReview"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openReview"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "createProject" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"createProject"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "continueOffline" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"continueOffline"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "goHome" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"goHome"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openAccountSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openAccountSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openMediaConversionSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openMediaConversionSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openDictionaries" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openDictionaries"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openPairing" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openPairing"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "closeSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"closeSettings"`,required:!0}}]}}],required:!0}},{key:`label`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``},children:{required:!1,tsType:{name:`ReactNode`},description:``}}}})))()}export{w as n,S as t};