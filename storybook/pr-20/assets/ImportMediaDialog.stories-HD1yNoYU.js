import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-DmCPURdx.js";import{n,t as r}from"./clsx-CTwy9ux-.js";import{t as i}from"./jsx-runtime-DeHZSEgm.js";import{n as a,t as o}from"./Button-KG4HKgfk.js";import{i as s,n as c,r as l,s as u,t as d}from"./PluginFormDialog-BZQY7bG9.js";function f(e,t,n){return{at_ms:p+e*1e3,level:t,message:n}}var p,m,h;function g(){return(g=e((()=>{p=17672256e5,m={id:`job-1`,project_id:`p1`,plugin:`video-site-media-source`,locator:`https://videos.example.com/watch/abc123def45`,status:`running`,progress:{fraction:.45,message:`downloading the video and subtitles`},log:[f(0,`info`,`downloader 2026.08.19`),f(0,`info`,`reading the video's description`),f(2,`info`,`fetching subtitles in en, ja-orig`),f(2,`info`,`downloading the video and subtitles`),f(2,`info`,`running video-site --no-playlist -f "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4]/b" …`),f(3,`output`,`[download]  12.5% of   48.21MiB at    3.10MiB/s ETA 00:13`),f(4,`output`,`[download]  31.9% of   48.21MiB at    3.25MiB/s ETA 00:10`),f(5,`output`,`[download]  45.0% of   48.21MiB at    3.30MiB/s ETA 00:08`)],media_file:null,skipped_subtitles:[],error:null,started_at_ms:p,finished_at_ms:null},h={...m,id:`job-2`,status:`failed`,progress:{fraction:0,message:`reading the video's description`},log:[f(0,`info`,`downloader 2026.08.19`),f(0,`info`,`reading the video's description`),f(0,`info`,`running video-site --no-playlist --skip-download …`),f(1,`output`,`ERROR: [video-site] abc123def45: Private video. Sign in if you've been granted access to this video`),f(1,`warn`,`video-site finished with exit code 1 after 1.2 s`),f(1,`error`,`ERROR: [video-site] abc123def45: Private video. Sign in if you've been granted access to this video`)],error:{code:`media_source_failed`,message:`ERROR: [video-site] abc123def45: Private video. Sign in if you've been granted access to this video`},finished_at_ms:1767225601200}})))()}async function _(e){if(navigator.clipboard)return navigator.clipboard.writeText(e);v(e)}function v(e){let t=y(e);document.body.append(t),t.select();let n=document.execCommand(`copy`);if(t.remove(),!n)throw Error(`The browser refused to copy the text.`)}function y(e){let t=document.createElement(`textarea`);return t.value=e,t.setAttribute(`readonly`,``),t.style.position=`fixed`,t.style.left=`-9999px`,t}function b({lines:e}){let t=(0,w.useRef)(null),n=e.length;return(0,w.useEffect)(()=>{let e=t.current;e&&n>0&&(e.scrollTop=e.scrollHeight)},[n]),(0,T.jsxs)(`div`,{className:`relative mt-1`,children:[(0,T.jsx)(`ol`,{ref:t,"aria-label":`Log`,className:`max-h-40 overflow-y-auto rounded border border-line bg-surface-muted p-2 pr-16 font-mono whitespace-pre-wrap`,children:C(e).map(({line:e,key:t})=>(0,T.jsx)(`li`,{className:r(e.level===`output`&&`text-fg-muted`,e.level===`warn`&&`text-warning-fg`,e.level===`error`&&`text-danger-fg`),children:e.message},t))}),(0,T.jsx)(S,{lines:e})]})}function x(e){return e.map(e=>`[${e.level}] ${e.message}`).join(`
`)}function S({lines:e}){let[t,n]=(0,w.useState)(!1);return(0,w.useEffect)(()=>{if(!t)return;let e=setTimeout(()=>n(!1),E);return()=>clearTimeout(e)},[t]),(0,T.jsx)(o,{size:`sm`,className:`absolute top-1 right-3`,"aria-disabled":e.length===0,onClick:e.length===0?void 0:()=>{_(x(e)).then(()=>n(!0))},children:t?`Copied`:`Copy`})}function C(e){let t=new Map;return e.map(e=>{let n=`${e.at_ms} ${e.level} ${e.message}`,r=t.get(n)??0;return t.set(n,r+1),{line:e,key:`${n} #${r}`}})}var w,T,E;function D(){return(D=e((()=>{n(),w=t(),a(),T=i(),E=2e3,b.__docgenInfo={description:`The log lines, newest at the bottom, kept scrolled to the latest while they arrive,
with a button that copies them all as plain text.`,methods:[],displayName:`FetchLog`,props:{lines:{required:!0,tsType:{name:`unknown`},description:``}}}})))()}function O({job:e}){let t=e.progress?.fraction??null,n=e.status===`running`?e.progress?.message??`Starting the fetch`:e.status===`done`?`Done`:`Failed`;return(0,A.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,A.jsx)(k,{fraction:e.status===`done`?1:t}),(0,A.jsxs)(`p`,{className:`text-sm text-fg-muted`,role:`status`,children:[n,e.status===`running`&&`. This can take a few minutes.`]}),(0,A.jsxs)(`details`,{open:e.status===`failed`,className:`text-xs`,children:[(0,A.jsx)(`summary`,{className:`cursor-pointer text-fg-muted`,children:`Log`}),(0,A.jsx)(b,{lines:e.log})]})]})}function k({fraction:e}){let t=e===null?null:Math.round(e*100);return(0,A.jsx)(`div`,{role:`progressbar`,"aria-label":`Fetch progress`,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":t??void 0,className:`h-1.5 w-full overflow-hidden rounded bg-surface-muted`,children:(0,A.jsx)(`div`,{className:r(`h-full bg-accent transition-[width]`,t===null&&`animate-pulse`),style:{width:`${t??100}%`}})})}var A;function j(){return(j=e((()=>{n(),D(),A=i(),O.__docgenInfo={description:`The fetch's progress bar, its latest step, and the log of what the plugin reported, open once the fetch fails.`,methods:[],displayName:`FetchProgress`,props:{job:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ id: MediaSourceJobId, project_id: ProjectId, plugin: string, locator: MediaLocator, status: MediaSourceJobStatus, 
/**
 * The plugin's latest progress report.
 */
progress: ProgressEvent | null, 
/**
 * What the plugin and its commands reported, oldest first; only the latest lines are kept.
 */
log: Array<MediaSourceLogLine>, 
/**
 * The added media file, once the job is done.
 */
media_file: MediaFile | null, 
/**
 * The subtitle tracks asked for that were not added, once the job is done.
 */
skipped_subtitles: Array<SkippedSubtitle>, 
/**
 * Why the job failed, once it has.
 */
error: ApiError | null, 
/**
 * Milliseconds since the Unix epoch.
 */
started_at_ms: number, finished_at_ms: number | null, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`project_id`,value:{name:`string`,required:!0}},{key:`plugin`,value:{name:`string`,required:!0}},{key:`locator`,value:{name:`string`,required:!0}},{key:`status`,value:{name:`union`,raw:`"running" | "done" | "failed"`,elements:[{name:`literal`,value:`"running"`},{name:`literal`,value:`"done"`},{name:`literal`,value:`"failed"`}],required:!0}},{key:`progress`,value:{name:`union`,raw:`ProgressEvent | null`,elements:[{name:`signature`,type:`object`,raw:`{ fraction: number, message: string, }`,signature:{properties:[{key:`fraction`,value:{name:`number`,required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The plugin's latest progress report.`},{key:`log`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * Milliseconds since the Unix epoch.
 */
at_ms: number, level: MediaSourceLogLevel, message: string, }`,signature:{properties:[{key:`at_ms`,value:{name:`number`,required:!0},description:`Milliseconds since the Unix epoch.`},{key:`level`,value:{name:`union`,raw:`"info" | "warn" | "error" | "output"`,elements:[{name:`literal`,value:`"info"`},{name:`literal`,value:`"warn"`},{name:`literal`,value:`"error"`},{name:`literal`,value:`"output"`}],required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}}],raw:`Array<MediaSourceLogLine>`,required:!0},description:`What the plugin and its commands reported, oldest first; only the latest lines are kept.`},{key:`media_file`,value:{name:`union`,raw:`MediaFile | null`,elements:[{name:`signature`,type:`object`,raw:`{ id: MediaFileId, project_id: ProjectId, 
/**
 * The name shown in the project's media list, usually the file name.
 */
name: string, source: MediaFileSource, 
/**
 * Where the file was fetched from, when a media-source plugin fetched it.
 */
origin: MediaOrigin | null, 
/**
 * Milliseconds since the Unix epoch.
 */
created_at_ms: number, 
/**
 * The user's saved choice of video and audio tracks, as the JSON the media crate
 * defines. Null until the user has chosen.
 */
track_selection_json: string | null, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`project_id`,value:{name:`string`,required:!0}},{key:`name`,value:{name:`string`,required:!0},description:`The name shown in the project's media list, usually the file name.`},{key:`source`,value:{name:`union`,raw:`{ "kind": "path", path: string, } | { "kind": "browser_file", size: number, 
/**
 * The file's modification time in milliseconds since the Unix epoch.
 */
last_modified_ms: number, }`,elements:[{name:`signature`,type:`object`,raw:`{ "kind": "path", path: string, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"path"`,required:!0}},{key:`path`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "browser_file", size: number, 
/**
 * The file's modification time in milliseconds since the Unix epoch.
 */
last_modified_ms: number, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"browser_file"`,required:!0}},{key:`size`,value:{name:`number`,required:!0}},{key:`last_modified_ms`,value:{name:`number`,required:!0},description:`The file's modification time in milliseconds since the Unix epoch.`}]}}],required:!0}},{key:`origin`,value:{name:`union`,raw:`MediaOrigin | null`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * The name of the media-source plugin.
 */
plugin: string, locator: MediaLocator, }`,signature:{properties:[{key:`plugin`,value:{name:`string`,required:!0},description:`The name of the media-source plugin.`},{key:`locator`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`Where the file was fetched from, when a media-source plugin fetched it.`},{key:`created_at_ms`,value:{name:`number`,required:!0},description:`Milliseconds since the Unix epoch.`},{key:`track_selection_json`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`The user's saved choice of video and audio tracks, as the JSON the media crate
defines. Null until the user has chosen.`}]}},{name:`null`}],required:!0},description:`The added media file, once the job is done.`},{key:`skipped_subtitles`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * The id the source offered the track under.
 */
id: string, reason: string, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0},description:`The id the source offered the track under.`},{key:`reason`,value:{name:`string`,required:!0}}]}}],raw:`Array<SkippedSubtitle>`,required:!0},description:`The subtitle tracks asked for that were not added, once the job is done.`},{key:`error`,value:{name:`union`,raw:`ApiError | null`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * A stable, machine-readable identifier such as \`unauthorized\`.
 */
code: string, message: string, }`,signature:{properties:[{key:`code`,value:{name:`string`,required:!0},description:"A stable, machine-readable identifier such as `unauthorized`."},{key:`message`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`Why the job failed, once it has.`},{key:`started_at_ms`,value:{name:`number`,required:!0},description:`Milliseconds since the Unix epoch.`},{key:`finished_at_ms`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!0}}]}},description:``}}}})))()}function M({label:e,form:t,isBusy:n,job:r,error:i,onAction:a,onClose:o}){let s=r?.status===`running`,c=i??(r?.status===`failed`?r.error?.message??`The media could not be added.`:null);return(0,N.jsx)(d,{form:t,fallbackTitle:e,loadingMessage:`Asking the plugin what it needs…`,error:c,isBusy:n||s,onAction:a,onClose:o,closeLabel:s?`Close`:`Cancel`,children:r&&(0,N.jsx)(O,{job:r})})}var N;function P(){return(P=e((()=>{c(),j(),N=i(),M.__docgenInfo={description:`Shows the import interface of a media-source plugin: the forms it asks for, one after another,
and then the fetch the last one started. Fetching lasts a while, so the dialog stays open
with the form locked, showing the fetch's progress and what the plugin reports,
until the caller reports the outcome. A failed fetch leaves its log open to read.`,methods:[],displayName:`ImportMediaDialog`,props:{label:{required:!0,tsType:{name:`string`},description:`The plugin's import button label, which names the dialog until the plugin's form arrives.`},form:{required:!0,tsType:{name:`union`,raw:`PluginForm | null`,elements:[{name:`signature`,type:`object`,raw:`{ title: string, 
/**
 * Explains the form under its title.
 */
description: string | null, fields: Array<FormField>, actions: Array<FormAction>, }`,signature:{properties:[{key:`title`,value:{name:`string`,required:!0}},{key:`description`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`Explains the form under its title.`},{key:`fields`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * Names the field in the input the app sends back.
 */
id: string, label: string, 
/**
 * Explains the field under its label.
 */
hint: string | null, control: FormControl, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0},description:`Names the field in the input the app sends back.`},{key:`label`,value:{name:`string`,required:!0}},{key:`hint`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`Explains the field under its label.`},{key:`control`,value:{name:`union`,raw:`{ "kind": "text", value: string, placeholder: string | null, } | { "kind": "choose-one", options: Array<FormOption>, 
/**
 * The ids of the options chosen to begin with.
 */
chosen: Array<string>, } | { "kind": "choose-many", options: Array<FormOption>, 
/**
 * The ids of the options chosen to begin with.
 */
chosen: Array<string>, } | { "kind": "toggle", on: boolean, } | { "kind": "note", text: string, } | { "kind": "hidden", value: string, }`,elements:[{name:`signature`,type:`object`,raw:`{ "kind": "text", value: string, placeholder: string | null, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"text"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}},{key:`placeholder`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "choose-one", options: Array<FormOption>, 
/**
 * The ids of the options chosen to begin with.
 */
chosen: Array<string>, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"choose-one"`,required:!0}},{key:`options`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ id: string, label: string, 
/**
 * Explains the option beside its label.
 */
hint: string | null, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`label`,value:{name:`string`,required:!0}},{key:`hint`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`Explains the option beside its label.`}]}}],raw:`Array<FormOption>`,required:!0}},{key:`chosen`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`The ids of the options chosen to begin with.`}]}},{name:`signature`,type:`object`,raw:`{ "kind": "choose-many", options: Array<FormOption>, 
/**
 * The ids of the options chosen to begin with.
 */
chosen: Array<string>, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"choose-many"`,required:!0}},{key:`options`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ id: string, label: string, 
/**
 * Explains the option beside its label.
 */
hint: string | null, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`label`,value:{name:`string`,required:!0}},{key:`hint`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`Explains the option beside its label.`}]}}],raw:`Array<FormOption>`,required:!0}},{key:`chosen`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`The ids of the options chosen to begin with.`}]}},{name:`signature`,type:`object`,raw:`{ "kind": "toggle", on: boolean, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"toggle"`,required:!0}},{key:`on`,value:{name:`boolean`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "note", text: string, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"note"`,required:!0}},{key:`text`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "hidden", value: string, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"hidden"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}}],required:!0}}]}}],raw:`Array<FormField>`,required:!0}},{key:`actions`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ id: string, label: string, style: FormActionStyle, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`label`,value:{name:`string`,required:!0}},{key:`style`,value:{name:`union`,raw:`"primary" | "secondary" | "destructive"`,elements:[{name:`literal`,value:`"primary"`},{name:`literal`,value:`"secondary"`},{name:`literal`,value:`"destructive"`}],required:!0}}]}}],raw:`Array<FormAction>`,required:!0}}]}},{name:`null`}]},description:`The form the plugin asked for, or null while it is being asked for.`},isBusy:{required:!0,tsType:{name:`boolean`},description:`Whether the plugin is answering an action.`},job:{required:!0,tsType:{name:`union`,raw:`MediaSourceJob | null`,elements:[{name:`signature`,type:`object`,raw:`{ id: MediaSourceJobId, project_id: ProjectId, plugin: string, locator: MediaLocator, status: MediaSourceJobStatus, 
/**
 * The plugin's latest progress report.
 */
progress: ProgressEvent | null, 
/**
 * What the plugin and its commands reported, oldest first; only the latest lines are kept.
 */
log: Array<MediaSourceLogLine>, 
/**
 * The added media file, once the job is done.
 */
media_file: MediaFile | null, 
/**
 * The subtitle tracks asked for that were not added, once the job is done.
 */
skipped_subtitles: Array<SkippedSubtitle>, 
/**
 * Why the job failed, once it has.
 */
error: ApiError | null, 
/**
 * Milliseconds since the Unix epoch.
 */
started_at_ms: number, finished_at_ms: number | null, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`project_id`,value:{name:`string`,required:!0}},{key:`plugin`,value:{name:`string`,required:!0}},{key:`locator`,value:{name:`string`,required:!0}},{key:`status`,value:{name:`union`,raw:`"running" | "done" | "failed"`,elements:[{name:`literal`,value:`"running"`},{name:`literal`,value:`"done"`},{name:`literal`,value:`"failed"`}],required:!0}},{key:`progress`,value:{name:`union`,raw:`ProgressEvent | null`,elements:[{name:`signature`,type:`object`,raw:`{ fraction: number, message: string, }`,signature:{properties:[{key:`fraction`,value:{name:`number`,required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`The plugin's latest progress report.`},{key:`log`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * Milliseconds since the Unix epoch.
 */
at_ms: number, level: MediaSourceLogLevel, message: string, }`,signature:{properties:[{key:`at_ms`,value:{name:`number`,required:!0},description:`Milliseconds since the Unix epoch.`},{key:`level`,value:{name:`union`,raw:`"info" | "warn" | "error" | "output"`,elements:[{name:`literal`,value:`"info"`},{name:`literal`,value:`"warn"`},{name:`literal`,value:`"error"`},{name:`literal`,value:`"output"`}],required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}}],raw:`Array<MediaSourceLogLine>`,required:!0},description:`What the plugin and its commands reported, oldest first; only the latest lines are kept.`},{key:`media_file`,value:{name:`union`,raw:`MediaFile | null`,elements:[{name:`signature`,type:`object`,raw:`{ id: MediaFileId, project_id: ProjectId, 
/**
 * The name shown in the project's media list, usually the file name.
 */
name: string, source: MediaFileSource, 
/**
 * Where the file was fetched from, when a media-source plugin fetched it.
 */
origin: MediaOrigin | null, 
/**
 * Milliseconds since the Unix epoch.
 */
created_at_ms: number, 
/**
 * The user's saved choice of video and audio tracks, as the JSON the media crate
 * defines. Null until the user has chosen.
 */
track_selection_json: string | null, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`project_id`,value:{name:`string`,required:!0}},{key:`name`,value:{name:`string`,required:!0},description:`The name shown in the project's media list, usually the file name.`},{key:`source`,value:{name:`union`,raw:`{ "kind": "path", path: string, } | { "kind": "browser_file", size: number, 
/**
 * The file's modification time in milliseconds since the Unix epoch.
 */
last_modified_ms: number, }`,elements:[{name:`signature`,type:`object`,raw:`{ "kind": "path", path: string, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"path"`,required:!0}},{key:`path`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "browser_file", size: number, 
/**
 * The file's modification time in milliseconds since the Unix epoch.
 */
last_modified_ms: number, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"browser_file"`,required:!0}},{key:`size`,value:{name:`number`,required:!0}},{key:`last_modified_ms`,value:{name:`number`,required:!0},description:`The file's modification time in milliseconds since the Unix epoch.`}]}}],required:!0}},{key:`origin`,value:{name:`union`,raw:`MediaOrigin | null`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * The name of the media-source plugin.
 */
plugin: string, locator: MediaLocator, }`,signature:{properties:[{key:`plugin`,value:{name:`string`,required:!0},description:`The name of the media-source plugin.`},{key:`locator`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`Where the file was fetched from, when a media-source plugin fetched it.`},{key:`created_at_ms`,value:{name:`number`,required:!0},description:`Milliseconds since the Unix epoch.`},{key:`track_selection_json`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`The user's saved choice of video and audio tracks, as the JSON the media crate
defines. Null until the user has chosen.`}]}},{name:`null`}],required:!0},description:`The added media file, once the job is done.`},{key:`skipped_subtitles`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * The id the source offered the track under.
 */
id: string, reason: string, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0},description:`The id the source offered the track under.`},{key:`reason`,value:{name:`string`,required:!0}}]}}],raw:`Array<SkippedSubtitle>`,required:!0},description:`The subtitle tracks asked for that were not added, once the job is done.`},{key:`error`,value:{name:`union`,raw:`ApiError | null`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * A stable, machine-readable identifier such as \`unauthorized\`.
 */
code: string, message: string, }`,signature:{properties:[{key:`code`,value:{name:`string`,required:!0},description:"A stable, machine-readable identifier such as `unauthorized`."},{key:`message`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`Why the job failed, once it has.`},{key:`started_at_ms`,value:{name:`number`,required:!0},description:`Milliseconds since the Unix epoch.`},{key:`finished_at_ms`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!0}}]}},{name:`null`}]},description:`The fetch being watched, or null before one starts.`},error:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:`Why the form could not be shown or the fetch started, or null.`},onAction:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(actionId: string, input: FormInput[]) => void`,signature:{arguments:[{type:{name:`string`},name:`actionId`},{type:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ field: string, values: Array<string>, }`,signature:{properties:[{key:`field`,value:{name:`string`,required:!0}},{key:`values`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0}}]}}],raw:`FormInput[]`},name:`input`}],return:{name:`void`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}var F,I,L,R,z,B,V,H,U,W,G;function K(){return(K=e((()=>{u(),g(),P(),{fn:F}=__STORYBOOK_MODULE_TEST__,I={title:`Projects/ImportMediaDialog`,component:M,parameters:{layout:`fullscreen`},args:{label:`Add from a video site`,form:l,isBusy:!1,job:null,error:null,onAction:F(),onClose:F()}},L={args:{form:null}},R={},z={args:{form:s}},B={args:{form:s,isBusy:!0}},V={args:{form:s,job:m}},H={args:{form:s,job:h}},U={args:{form:s,error:`The server has no folder for fetched media.`}},W={args:{form:null,error:`The plugin “video-site” is not installed.`}},G=[`AskingForTheForm`,`FirstForm`,`LookedUp`,`WaitingForThePlugin`,`Running`,`Failed`,`CouldNotStart`,`FormUnavailable`]})))()}K();export{L as AskingForTheForm,U as CouldNotStart,H as Failed,R as FirstForm,W as FormUnavailable,z as LookedUp,V as Running,B as WaitingForThePlugin,G as __namedExportsOrder,I as default};