import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,r}from"./FooterActivityButton-84yvrwzN.js";import{n as i,t as a}from"./clsx-CTwy9ux-.js";function o({activities:e,onOpen:t,className:n,...r}){return(0,c.jsx)(`div`,{role:`menu`,className:a(`flex w-72 max-w-[calc(100vw-1rem)] flex-col rounded-md border border-line bg-surface py-1 text-sm shadow-lg`,n),...r,children:e.map(e=>(0,c.jsx)(`div`,{role:`none`,children:(0,c.jsx)(s,{activity:e,onOpen:t})},e.id))})}function s({activity:e,onOpen:t}){let r=e.status===`running`,{opens:i}=e;return(0,c.jsxs)(`button`,{type:`button`,role:`menuitem`,title:i?.label,"aria-disabled":i===null||void 0,className:a(`flex w-full items-center gap-2 px-3 py-1.5 text-left focus-visible:outline-none`,r?`text-fg focus-visible:bg-surface-muted`:`text-danger-fg focus-visible:bg-danger-soft`,i!==null&&(r?`hover:bg-surface-muted`:`hover:bg-danger-soft`)),onClick:i===null?void 0:()=>t(e),children:[(0,c.jsx)(n,{activity:e}),(0,c.jsx)(`span`,{className:`min-w-0 flex-1 truncate`,children:e.label}),r&&e.percent!==null&&(0,c.jsxs)(`span`,{className:`shrink-0 text-xs text-fg-muted tabular-nums`,children:[e.percent,`%`]})]})}var c;function l(){return(l=e((()=>{i(),r(),c=t(),o.__docgenInfo={description:`The activities as the rows of a menu, each with its bar or alert sign, its label and its percentage, and each opening its place in the app.
A row of an activity with no place is disabled.
The menu button that shows it handles the keys; this is only the list.`,methods:[],displayName:`FooterActivitiesList`,props:{activities:{required:!0,tsType:{name:`unknown`},description:``},onOpen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(activity: FooterActivity) => void`,signature:{arguments:[{type:{name:`intersection`,raw:`{
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
| { type: "createProject" }
| { type: "continueOffline" }
| { type: "goHome" }
| { type: "openSettings" }
/** Opens the general settings page, where the Account section is, over the main screen, leaving any page above it. */
| { type: "openAccountSettings" }
| { type: "openDictionaries" }
| { type: "closeSettings" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "openProject"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProject"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openProjectSettings"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProjectSettings"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "createProject" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"createProject"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "continueOffline" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"continueOffline"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "goHome" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"goHome"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openAccountSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openAccountSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openDictionaries" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openDictionaries"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "closeSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"closeSettings"`,required:!0}}]}}],required:!0}},{key:`label`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``}}}})))()}export{l as n,o as t};