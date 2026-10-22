import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./circle-alert-Cal2JrIz.js";import{n as i,t as a}from"./clsx-CTwy9ux-.js";import{a as o,i as s}from"./FooterActivityButton-ByZl0ffH.js";import{n as c,t as l}from"./FooterActivitiesList-xABawDGm.js";import{n as u}from"./pluralize-BdvhQ1v_.js";import{n as d,t as f}from"./MenuShell-CdO1_1xT.js";function p(e){let t=e.filter(e=>e.status===`failed`).length,n=e.length-t;return t===0?`${u(n,`task`)} running`:n===0?`${u(t,`task`)} failed`:`${t} failed, ${n} running`}function m(e){let t=e.flatMap(e=>e.status===`running`&&e.percent!==null?[e.percent]:[]);if(t.length===0)return null;let n=t.reduce((e,t)=>e+t,0);return Math.round(n/t.length)}function h(e){return e.map(e=>`${e.label}.`).join(` `)}function g(){return(g=e((()=>{})))()}function _({activities:e,onOpen:t,className:n}){let i=e.some(e=>e.status===`failed`),o=p(e);return(0,v.jsx)(f,{className:a(`min-w-0`,n),trigger:t=>(0,v.jsxs)(`button`,{type:`button`,title:`Show the tasks`,className:a(`flex min-w-0 max-w-full items-center gap-2 rounded-md px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`,i?`bg-danger-soft text-danger-fg hover:bg-danger-line`:`text-fg-muted hover:bg-surface-muted hover:text-fg`),...t,children:[i?(0,v.jsx)(r,{"aria-hidden":!0,className:`size-3.5 shrink-0`}):(0,v.jsx)(`span`,{"aria-hidden":!0,className:`w-12 shrink-0`,children:(0,v.jsx)(s,{label:o,percent:m(e)})}),(0,v.jsx)(`span`,{className:`truncate`,children:o})]}),menu:({close:n,...r})=>(0,v.jsx)(l,{...r,"aria-label":`Tasks`,activities:e,onOpen:e=>{n(),t(e)},className:`absolute bottom-full left-0 z-20 mb-1`})})}var v;function y(){return(y=e((()=>{i(),n(),c(),g(),d(),o(),v=t(),_.__docgenInfo={description:`One compact button standing for several activities, which opens a menu listing them above the footer.
While all run, it shows one bar at their mean percentage and counts them; once one fails,
it takes the danger colors and leads with the failures.
The menu's keys and closing are those of \`MenuShell\`.`,methods:[],displayName:`FooterActivitiesMenu`,props:{activities:{required:!0,tsType:{name:`unknown`},description:``},onOpen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(activity: FooterActivity) => void`,signature:{arguments:[{type:{name:`intersection`,raw:`{
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
| { type: "openDictionaries" }
| { type: "closeSettings" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "openProject"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProject"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openProjectSettings"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openProjectSettings"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openReview"; projectId: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openReview"`,required:!0}},{key:`projectId`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "createProject" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"createProject"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "continueOffline" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"continueOffline"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "goHome" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"goHome"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openAccountSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openAccountSettings"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "openDictionaries" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"openDictionaries"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "closeSettings" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"closeSettings"`,required:!0}}]}}],required:!0}},{key:`label`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The step to the activity's place, with what a click does as the tooltip says it: "Show on the dictionaries page".
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``},className:{required:!1,tsType:{name:`string`},description:``}}}})))()}export{g as i,y as n,h as r,_ as t};