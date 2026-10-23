import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-C3_-mBJd.js";import{I as n,Yt as r,jt as i,t as a,tn as o}from"./src-C5CV-g-T.js";import{i as s,r as c}from"./react-redux-DMV6PfHn.js";import{i as l,n as u,r as ee,t as d}from"./useAppSelector-ECqnbLsu.js";import{t as f}from"./jsx-runtime-DeHZSEgm.js";import{n as p,t as m}from"./createLucideIcon-Dq46me9F.js";import{n as te,t as ne}from"./clsx-CTwy9ux-.js";import{n as re,t as ie}from"./Button-DP1kBPxR.js";import{n as ae,t as oe}from"./IconButton-Djpdm6CF.js";import{b as se,c as h,h as ce,p as le,t as ue}from"./src-u1e5UP-2.js";import{n as g,t as _}from"./MenuShell-C_oEq1Tk.js";import{r as v,t as y}from"./FooterActivityButton-DPc5zi1j.js";import{i as b,n as x,r as S,t as C}from"./FooterActivitiesMenu-CxpMYwqD.js";import{a as de,i as fe,n as pe,o as me,r as he,t as ge}from"./syncStatusLine-BHfgyGXI.js";var w,T;function E(){return(E=e((()=>{p(),w={name:`cloud`,size:24,node:[[`path`,{d:`M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z`,key:`p7xjir`}]]},w.node,T=m(w)})))()}var D,O;function k(){return(k=e((()=>{p(),D={name:`laptop`,size:24,node:[[`path`,{d:`M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z`,key:`1pdavp`}],[`path`,{d:`M20.054 15.987H3.946`,key:`14rxg9`}]]},D.node,O=m(D)})))()}var A,j;function M(){return(M=e((()=>{p(),A={name:`monitor`,size:24,node:[[`rect`,{width:`20`,height:`14`,x:`2`,y:`3`,rx:`2`,key:`48i651`}],[`line`,{x1:`8`,x2:`16`,y1:`21`,y2:`21`,key:`1svkeh`}],[`line`,{x1:`12`,x2:`12`,y1:`17`,y2:`21`,key:`vw1qmm`}]]},A.node,j=m(A)})))()}var N,P;function F(){return(F=e((()=>{p(),N={name:`smartphone`,size:24,node:[[`rect`,{width:`14`,height:`20`,x:`5`,y:`2`,rx:`2`,ry:`2`,key:`1yt0o3`}],[`path`,{d:`M12 18h.01`,key:`mhygvu`}]]},N.node,P=m(N)})))()}function I({activities:e,onOpen:t}){return(0,L.jsxs)(`div`,{className:`@container flex min-w-0 flex-1 items-center`,children:[(0,L.jsx)(`span`,{role:`status`,className:`sr-only`,children:S(e)}),e.length<=2&&(0,L.jsx)(`div`,{className:e.length===2?`hidden min-w-0 items-center gap-2 @md:flex`:`flex min-w-0 items-center gap-2`,children:e.map(e=>(0,L.jsx)(y,{activity:e,onOpen:t},e.id))}),e.length>=2&&(0,L.jsx)(C,{activities:e,onOpen:t,className:e.length===2?`@md:hidden`:void 0})]})}var L;function R(){return(R=e((()=>{x(),v(),b(),L=f(),I.__docgenInfo={description:`The activities under way or failed, at the footer's left edge after the fixed controls.
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
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``}}}})))()}function z({syncMenu:e,activities:t,onOpenActivity:n,children:r}){return(0,B.jsx)(`footer`,{className:`sticky bottom-0 border-t border-line bg-surface`,children:(0,B.jsxs)(`div`,{className:`flex items-center justify-between gap-2 px-2 py-0.5`,children:[(0,B.jsxs)(`div`,{className:`flex min-w-0 flex-1 items-center gap-2`,children:[e,(0,B.jsx)(I,{activities:t,onOpen:n})]}),r&&(0,B.jsx)(`div`,{className:`flex shrink-0 items-center gap-1`,children:r})]})})}var B;function V(){return(V=e((()=>{R(),B=f(),z.__docgenInfo={description:`The thin bar at the bottom of the window, given its state as props: the Sync menu, which tells where the user's work is kept,
and the activities under way at its left edge, and the screen's own buttons, passed as children, at its right edge.
\`AppFooter\` gives it its state from the store.`,methods:[],displayName:`FooterBar`,props:{syncMenu:{required:!1,tsType:{name:`ReactNode`},description:``},activities:{required:!0,tsType:{name:`unknown`},description:``},onOpenActivity:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(activity: FooterActivity) => void`,signature:{arguments:[{type:{name:`intersection`,raw:`{
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
Null for an activity with no place to show it, which the footer only tells of.`}]}},{name:`unknown`}]},name:`activity`}],return:{name:`void`}}},description:``},children:{required:!1,tsType:{name:`ReactNode`},description:``}}}})))()}function H({status:e,place:t,sign:n,close:r,...i}){let a=de(n),o=fe(t),s=(0,W.useId)(),c=l(),u=e=>{r();for(let t of e.actions)c(t)};return(0,G.jsxs)(`div`,{...i,role:`dialog`,"aria-labelledby":s,className:`absolute bottom-full left-0 z-20 mb-1 flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-3 rounded-md border border-line bg-surface p-3 text-sm shadow-lg max-sm:left-2`,children:[(0,G.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,G.jsx)(`p`,{id:s,className:`font-medium`,children:e}),a!==null&&(0,G.jsx)(`p`,{className:`text-fg-muted`,children:a.explanation}),a?.fix&&(0,G.jsx)(U,{options:[a.fix],onChoose:u})]}),o.length>0&&(0,G.jsx)(`div`,{className:`border-t border-line pt-3`,children:(0,G.jsx)(U,{options:o,onChoose:u})})]})}function U({options:e,onChoose:t}){return(0,G.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:e.map(e=>(0,G.jsx)(ie,{size:`sm`,onClick:()=>t(e),children:e.label},e.label))})}var W,G;function K(){return(K=e((()=>{W=t(),re(),ee(),me(),he(),G=f(),H.__docgenInfo={description:`The Sync menu's open popover, above the footer: the status line, with what is wrong and its fix when something is,
then the buttons that would keep the work elsewhere.`,methods:[],displayName:`SyncMenuPanel`,props:{ref:{required:!0,tsType:{name:`RefObject`,elements:[{name:`union`,raw:`HTMLDivElement | null`,elements:[{name:`HTMLDivElement`},{name:`null`}]}],raw:`RefObject<HTMLDivElement | null>`},description:``},id:{required:!0,tsType:{name:`string`},description:``},onMouseDown:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(event: MouseEvent) => void`,signature:{arguments:[{type:{name:`MouseEvent`},name:`event`}],return:{name:`void`}}},description:``},close:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},status:{required:!0,tsType:{name:`string`},description:``},place:{required:!0,tsType:{name:`union`,raw:`| { kind: "thisDevice"; device: "browser" | "computer" | "mobile" }
/** On a server the app is logged in to, itself or through its built-in server, which last backed the work up at \`lastBackedUpMs\` if it says. */
| { kind: "server"; serverName: string; lastBackedUpMs: number | null }
/** On a desktop app this app is paired with over the local network, whose server is at \`serverUrl\`, or \`host\` as the copy names it. */
| {
    kind: "pairedDesktop";
    serverUrl: string;
    host: string;
    usesAccounts: boolean;
  }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: "thisDevice"; device: "browser" | "computer" | "mobile" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"thisDevice"`,required:!0}},{key:`device`,value:{name:`union`,raw:`"browser" | "computer" | "mobile"`,elements:[{name:`literal`,value:`"browser"`},{name:`literal`,value:`"computer"`},{name:`literal`,value:`"mobile"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "server"; serverName: string; lastBackedUpMs: number | null }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"server"`,required:!0}},{key:`serverName`,value:{name:`string`,required:!0}},{key:`lastBackedUpMs`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  kind: "pairedDesktop";
  serverUrl: string;
  host: string;
  usesAccounts: boolean;
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"pairedDesktop"`,required:!0}},{key:`serverUrl`,value:{name:`string`,required:!0}},{key:`host`,value:{name:`string`,required:!0}},{key:`usesAccounts`,value:{name:`boolean`,required:!0}}]}}]},description:``},sign:{required:!0,tsType:{name:`union`,raw:`| { kind: "hidden" }
/** Flashcards wait to be saved while the app runs without a server, so they are kept only in this browser. */
| { kind: "browserOnly" }
/** Flashcards the server failed to save are kept only in this browser until they are saved. */
| { kind: "failedSaves" }
/** Some project is kept only on the native app's built-in server. */
| {
    kind: "deviceOnly";
    platform: NativePlatform;
    hasOfficialServer: boolean;
  }
/** Some project is not yet backed up to the remote the built-in server is linked to, because the remote could not be reached since \`sinceMs\`. */
| {
    kind: "linkUnreachable";
    platform: NativePlatform;
    serverUrl: string;
    /** How the copy names the server: the easyImmerse cloud by that name, any other by its host. */
    serverName: string;
    sinceMs: number;
  }
/** Some project is not yet backed up to the remote the built-in server is linked to, because the last round failed with the error \`code\`. */
| {
    kind: "linkFailed";
    platform: NativePlatform;
    serverUrl: string;
    /** How the copy names the server: the easyImmerse cloud by that name, any other by its host. */
    serverName: string;
    isCloudServer: boolean;
    code: string;
  }
/** Some project is not yet backed up to the remote the built-in server is linked to, because the remote logged out the account with this email address. */
| {
    kind: "loggedOut";
    platform: NativePlatform;
    serverUrl: string;
    serverName: string;
    email: string;
  }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: "hidden" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"hidden"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "browserOnly" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"browserOnly"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "failedSaves" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"failedSaves"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  kind: "deviceOnly";
  platform: NativePlatform;
  hasOfficialServer: boolean;
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"deviceOnly"`,required:!0}},{key:`platform`,value:{name:`union`,raw:`"desktop" | "mobile"`,elements:[{name:`literal`,value:`"desktop"`},{name:`literal`,value:`"mobile"`}],required:!0}},{key:`hasOfficialServer`,value:{name:`boolean`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  kind: "linkUnreachable";
  platform: NativePlatform;
  serverUrl: string;
  /** How the copy names the server: the easyImmerse cloud by that name, any other by its host. */
  serverName: string;
  sinceMs: number;
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"linkUnreachable"`,required:!0}},{key:`platform`,value:{name:`union`,raw:`"desktop" | "mobile"`,elements:[{name:`literal`,value:`"desktop"`},{name:`literal`,value:`"mobile"`}],required:!0}},{key:`serverUrl`,value:{name:`string`,required:!0}},{key:`serverName`,value:{name:`string`,required:!0},description:`How the copy names the server: the easyImmerse cloud by that name, any other by its host.`},{key:`sinceMs`,value:{name:`number`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  kind: "linkFailed";
  platform: NativePlatform;
  serverUrl: string;
  /** How the copy names the server: the easyImmerse cloud by that name, any other by its host. */
  serverName: string;
  isCloudServer: boolean;
  code: string;
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"linkFailed"`,required:!0}},{key:`platform`,value:{name:`union`,raw:`"desktop" | "mobile"`,elements:[{name:`literal`,value:`"desktop"`},{name:`literal`,value:`"mobile"`}],required:!0}},{key:`serverUrl`,value:{name:`string`,required:!0}},{key:`serverName`,value:{name:`string`,required:!0},description:`How the copy names the server: the easyImmerse cloud by that name, any other by its host.`},{key:`isCloudServer`,value:{name:`boolean`,required:!0}},{key:`code`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  kind: "loggedOut";
  platform: NativePlatform;
  serverUrl: string;
  serverName: string;
  email: string;
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"loggedOut"`,required:!0}},{key:`platform`,value:{name:`union`,raw:`"desktop" | "mobile"`,elements:[{name:`literal`,value:`"desktop"`},{name:`literal`,value:`"mobile"`}],required:!0}},{key:`serverUrl`,value:{name:`string`,required:!0}},{key:`serverName`,value:{name:`string`,required:!0}},{key:`email`,value:{name:`string`,required:!0}}]}}]},description:``}}}})))()}function q(){let e=u(r),t=e===`builtInServer`,n=e===`accountServer`;se(void 0,{skip:!t}),ce(void 0,{pollingInterval:J,skip:!t}),h(`self`,{skip:!n}),le(`self`,{skip:!n})}var J;function Y(){return(Y=e((()=>{ue(),a(),d(),J=5e3})))()}function X({isInitiallyOpen:e=!1}){q();let t=u(n,s),r=u(i,s),a=pe(t,r);return(0,Z.jsx)(_,{popup:`dialog`,className:`shrink-0 max-sm:static`,isInitiallyOpen:e,trigger:e=>(0,Z.jsx)(oe,{label:a,...e,children:(0,Z.jsx)(_e,{place:t,isFault:o(r)})}),menu:e=>(0,Z.jsx)(H,{...e,status:a,place:t,sign:r})})}function _e({place:e,isFault:t}){let n=e.kind===`thisDevice`?Q.thisDevice[e.device]:Q[e.kind];return(0,Z.jsx)(n,{"aria-hidden":!0,className:ne(`size-4`,t&&`text-warning-fg`)})}var Z,Q;function $(){return($=e((()=>{a(),te(),E(),k(),M(),F(),c(),ae(),g(),d(),K(),ge(),Y(),Z=f(),Q={thisDevice:{browser:P,computer:j,mobile:P},server:T,pairedDesktop:O},X.__docgenInfo={description:`The Sync button in the footer, whose icon tells where the person's work is kept: on this device, on a server, or on a paired desktop app.
The icon takes the warning colour while the work cannot be backed up, and the button is named by its status line.
It opens a popover that tells where the work is, what is wrong and how to fix it, and the ways of keeping the work elsewhere.
With \`isInitiallyOpen\`, the popover starts open.`,methods:[],displayName:`SyncMenu`,props:{isInitiallyOpen:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}}}}})))()}export{V as i,$ as n,z as r,X as t};