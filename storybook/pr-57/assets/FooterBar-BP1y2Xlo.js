import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./ThemeMenu-D4w4rzrN.js";import{n as i,t as a}from"./settings-CVfZK96W.js";import{n as o,t as s}from"./IconButton-Djpdm6CF.js";import{r as c,t as l}from"./FooterActivityButton-CdBJVGYJ.js";import{i as u,n as d,r as f,t as p}from"./FooterActivitiesMenu-CSuRaX3z.js";function m({activities:e,onOpen:t}){return(0,h.jsxs)(`div`,{className:`@container flex min-w-0 flex-1 items-center`,children:[(0,h.jsx)(`span`,{role:`status`,className:`sr-only`,children:f(e)}),e.length<=2&&(0,h.jsx)(`div`,{className:e.length===2?`hidden min-w-0 items-center gap-2 @md:flex`:`flex min-w-0 items-center gap-2`,children:e.map(e=>(0,h.jsx)(l,{activity:e,onOpen:t},e.id))}),e.length>=2&&(0,h.jsx)(p,{activities:e,onOpen:t,className:e.length===2?`@md:hidden`:void 0})]})}var h;function g(){return(g=e((()=>{d(),c(),u(),h=t(),m.__docgenInfo={description:`The activities under way or failed, at the footer's left edge after the fixed controls.
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
/** Opens the account settings screen, where the app logs in to an account or shows the one it is logged in to. */
| { type: "openAccountSettings" }
/** Opens the general settings page at its Media conversion section, over the main screen, leaving any page above it. */
| { type: "openMediaConversionSettings" }
| { type: "openDictionaries" }
/** Opens the page for pairing with another easyImmerse app on the local network. */
| { type: "openPairing" }
| { type: "closeSettings" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "openProject"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProject"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openProjectSettings"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProjectSettings"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openReview"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openReview"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "createProject" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"createProject"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "continueOffline" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"continueOffline"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "goHome" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"goHome"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openAccountSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openAccountSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openMediaConversionSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openMediaConversionSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openDictionaries" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openDictionaries"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openPairing" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openPairing"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "closeSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"closeSettings"`,required:!0}}]}}],required:!0}},{key:`label`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``}}}})))()}function _({isSettingsOpen:e,onOpenSettings:t,cloudMenu:n,activities:i,onOpenActivity:o,children:c}){return(0,v.jsx)(`footer`,{className:`sticky bottom-0 border-t border-line bg-surface`,children:(0,v.jsxs)(`div`,{className:`flex items-center justify-between gap-2 px-2 py-0.5`,children:[(0,v.jsxs)(`div`,{className:`flex min-w-0 flex-1 items-center gap-2`,children:[(0,v.jsx)(s,{label:`Settings`,"aria-current":e?`page`:void 0,"aria-disabled":e||void 0,onClick:e?void 0:t,children:(0,v.jsx)(a,{className:`size-4`})}),(0,v.jsx)(r,{}),n,(0,v.jsx)(m,{activities:i,onOpen:o})]}),c&&(0,v.jsx)(`div`,{className:`flex shrink-0 items-center gap-1`,children:c})]})})}var v;function y(){return(y=e((()=>{i(),g(),o(),n(),v=t(),_.__docgenInfo={description:`The thin bar at the bottom of the window, given its state as props: the way to Settings, the theme menu,
the cloud menu, which tells whether the user's work is backed up, and the activities under way at its left edge,
and the screen's own buttons, passed as children, at its right edge.
\`AppFooter\` gives it its state from the store.`,methods:[],displayName:`FooterBar`,props:{isSettingsOpen:{required:!0,tsType:{name:`boolean`},description:``},onOpenSettings:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},cloudMenu:{required:!1,tsType:{name:`ReactNode`},description:``},activities:{required:!0,tsType:{name:`unknown`},description:``},onOpenActivity:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(activity: FooterActivity) => void`,signature:{arguments:[{type:{name:`intersection`,raw:`{
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
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``},children:{required:!1,tsType:{name:`ReactNode`},description:``}}}})))()}export{y as n,_ as t};