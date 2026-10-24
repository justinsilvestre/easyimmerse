import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-B3d50K4E.js";import{t as n}from"./jsx-runtime-DeHZSEgm.js";import{n as r,t as i}from"./Button-B-ZkWXW4.js";import{i as a,r as o}from"./useAppSelector-8HSpQRqD.js";import{a as s,i as c,n as l,o as u,r as d,t as f}from"./syncStatusLine-C-NTeOFb.js";function p({place:e,sign:t,onDismiss:n}){let r=(0,m.useId)(),o=a(),u=s(t)?.explanation;return(0,h.jsxs)(`section`,{"aria-labelledby":r,className:`flex flex-col gap-3 rounded-md border border-line bg-surface p-4 text-sm`,children:[(0,h.jsx)(`h2`,{id:r,className:`text-base font-semibold`,children:l(e,t)}),u&&(0,h.jsx)(`p`,{className:`text-fg-muted`,children:u}),(0,h.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[c(e).map(e=>(0,h.jsx)(i,{size:`sm`,onClick:()=>{for(let t of e.actions)o(t)},children:e.label},e.label)),(0,h.jsx)(i,{size:`sm`,variant:`subtle`,onClick:n,children:`Not now`})]})]})}var m,h;function g(){return(g=e((()=>{m=t(),r(),u(),d(),f(),o(),h=n(),p.__docgenInfo={description:`A card that warns that the person's work is kept only on this device and could be lost,
with the Sync menu's ways of keeping it elsewhere and a "Not now" button, which calls \`onDismiss\`.`,methods:[],displayName:`BackupNudgeCard`,props:{place:{required:!0,tsType:{name:`union`,raw:`| { kind: "thisDevice"; device: "browser" | "computer" | "mobile" }
/** On a server the app is logged in to, itself or through its built-in server, which last backed the work up at \`lastBackedUpMs\` if it says. */
| { kind: "server"; serverName: string; lastBackedUpMs: number | null }
/** On a desktop app this app is paired with over the local network, whose server is at \`serverUrl\`, or \`host\` as the copy names it, on the computer named \`deviceName\` if the server says. */
| {
    kind: "pairedDesktop";
    serverUrl: string;
    host: string;
    deviceName: string | null;
    usesAccounts: boolean;
  }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: "thisDevice"; device: "browser" | "computer" | "mobile" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"thisDevice"`,required:!0}},{key:`device`,value:{name:`union`,raw:`"browser" | "computer" | "mobile"`,elements:[{name:`literal`,value:`"browser"`},{name:`literal`,value:`"computer"`},{name:`literal`,value:`"mobile"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "server"; serverName: string; lastBackedUpMs: number | null }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"server"`,required:!0}},{key:`serverName`,value:{name:`string`,required:!0}},{key:`lastBackedUpMs`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{
  kind: "pairedDesktop";
  serverUrl: string;
  host: string;
  deviceName: string | null;
  usesAccounts: boolean;
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"pairedDesktop"`,required:!0}},{key:`serverUrl`,value:{name:`string`,required:!0}},{key:`host`,value:{name:`string`,required:!0}},{key:`deviceName`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}},{key:`usesAccounts`,value:{name:`boolean`,required:!0}}]}}]},description:``},sign:{required:!0,tsType:{name:`union`,raw:`| { kind: "hidden" }
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
}`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"loggedOut"`,required:!0}},{key:`platform`,value:{name:`union`,raw:`"desktop" | "mobile"`,elements:[{name:`literal`,value:`"desktop"`},{name:`literal`,value:`"mobile"`}],required:!0}},{key:`serverUrl`,value:{name:`string`,required:!0}},{key:`serverName`,value:{name:`string`,required:!0}},{key:`email`,value:{name:`string`,required:!0}}]}}]},description:``},onDismiss:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}export{g as n,p as t};