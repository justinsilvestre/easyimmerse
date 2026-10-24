import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./Button-B-ZkWXW4.js";import{n as i,t as a}from"./LinkButton-BO5wRhcF.js";import{n as o,t as s}from"./SelectField-B50kTky4.js";import{t as c,yn as l}from"./src-57cw9JLc.js";import{r as u}from"./preferencesSelectors-UwveezPo.js";import{i as d,n as f,r as p,t as m}from"./useAppSelector-LP32sAP4.js";import{n as h,t as g}from"./PreferenceToggle-DC8BNzGR.js";function _(){let e=d(),t=t=>()=>e(l.externalLinkRequested(t));return(0,v.jsxs)(`div`,{className:`flex flex-col gap-2 rounded-md border border-line bg-surface-muted p-3 text-sm`,children:[(0,v.jsx)(`p`,{children:`To convert video that cannot play directly, install an ffmpeg build with a software H.264 encoder (libx264 or libopenh264), then choose its ffmpeg program above. easyImmerse runs the build you choose as a separate program and does not include it.`}),(0,v.jsxs)(`ul`,{className:`flex list-disc flex-col gap-1 pl-5`,children:[(0,v.jsxs)(`li`,{children:[`macOS: install Homebrew's build with`,` `,(0,v.jsx)(`code`,{className:`font-mono`,children:`brew install ffmpeg`}),`, which includes libx264 and is licensed under the GPL. On Apple silicon, its ffmpeg is in /opt/homebrew/bin.`]}),(0,v.jsxs)(`li`,{children:[`Windows: download the essentials or full build from`,` `,(0,v.jsx)(a,{onClick:t(y),children:`gyan.dev`}),`, which include libx264 and are licensed under the GPL. Or download a build from`,` `,(0,v.jsx)(a,{onClick:t(b),children:`BtbN's FFmpeg builds`}),`: a gpl build includes libx264 and libopenh264, and an lgpl build includes libopenh264 only. Unpack it and choose ffmpeg.exe in its bin folder.`]}),(0,v.jsxs)(`li`,{children:[`Linux: install your distribution's ffmpeg package. On Debian and Ubuntu, `,(0,v.jsx)(`code`,{className:`font-mono`,children:`sudo apt install ffmpeg`}),` `,`installs a build that includes libx264.`]})]})]})}var v,y,b;function x(){return(x=e((()=>{c(),i(),p(),v=t(),y=`https://www.gyan.dev/ffmpeg/builds/`,b=`https://github.com/BtbN/FFmpeg-Builds/releases`,_.__docgenInfo={description:`Explains, for each desktop platform, how to install an ffmpeg build with a software H.264 encoder, and which builds include one.`,methods:[],displayName:`FfmpegGuidance`}})))()}function S(e){let{capabilities:t}=e;switch(t.kind){case`loading`:return(0,E.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`Checking the ffmpeg build…`});case`failed`:return(0,E.jsxs)(`p`,{role:`alert`,className:`text-sm text-danger-fg`,children:[`The ffmpeg build could not be checked: `,t.message]});case`loaded`:return(0,E.jsx)(C,{...e,capabilities:t.capabilities})}}function C({capabilities:e,choice:t,onChoose:n,onUseBundled:i}){let{ffmpeg:a}=e,o=a===null||e.encoder_discovery_finished&&e.video_encoder===null;return(0,E.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,E.jsxs)(`div`,{className:`flex flex-col gap-1 text-sm`,children:[(0,E.jsx)(w,{ffmpeg:a}),a!==null&&(0,E.jsx)(T,{capabilities:e})]}),(0,E.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,E.jsx)(r,{"aria-disabled":!t.canChoose,onClick:t.canChoose?n:void 0,children:`Choose an ffmpeg build`}),a?.is_custom&&(0,E.jsx)(r,{variant:`subtle`,"aria-disabled":!t.canChoose,onClick:t.canChoose?i:void 0,children:`Use the bundled build`}),t.isSaving&&(0,E.jsx)(`p`,{role:`status`,className:`text-sm text-fg-muted`,children:`Restarting the server with the build…`})]}),t.failure!==null&&(0,E.jsx)(`p`,{role:`alert`,className:`text-sm text-danger-fg`,children:t.failure}),o&&(0,E.jsx)(_,{})]})}function w({ffmpeg:e}){return e===null?(0,E.jsx)(`p`,{children:`No ffmpeg build was found, so media conversion is unavailable.`}):e.is_custom?(0,E.jsxs)(`p`,{children:[`In use: the ffmpeg build at`,` `,(0,E.jsx)(`span`,{className:`font-mono break-all`,children:e.path}),`, version`,` `,e.version,`.`]}):(0,E.jsxs)(`p`,{children:[`In use: the bundled ffmpeg build, version `,e.version,`.`]})}function T({capabilities:e}){if(!e.encoder_discovery_finished)return(0,E.jsx)(`p`,{role:`status`,className:`text-fg-muted`,children:`Looking for a video encoder…`});let t=e.video_encoder;return t===null?(0,E.jsx)(`p`,{className:`text-warning-fg`,children:`No usable video encoder.`}):(0,E.jsxs)(`p`,{children:[`Video encoder: `,(0,E.jsx)(`span`,{className:`font-mono`,children:t.name}),` (`,t.software?`software`:`hardware`,`).`]})}var E;function D(){return(D=e((()=>{n(),x(),E=t(),S.__docgenInfo={description:`Which ffmpeg build converts media and which video encoder it found, with buttons to choose another build or go back to the bundled one.
When no encoder works, it explains how to get a build that has one.`,methods:[],displayName:`FfmpegBuildBlock`,props:{capabilities:{required:!0,tsType:{name:`union`,raw:`| { kind: "loading" }
| { kind: "failed"; message: string }
| { kind: "loaded"; capabilities: ConversionCapabilities }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: "loading" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"loading"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "failed"; message: string }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"failed"`,required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "loaded"; capabilities: ConversionCapabilities }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"loaded"`,required:!0}},{key:`capabilities`,value:{name:`signature`,type:`object`,raw:`{ 
/**
 * None when the server has no conversion service (no ffmpeg found or no cache directory).
 */
ffmpeg: FfmpegBuild | null, 
/**
 * Whether encoder discovery has finished. While false, \`video_encoder\` is not known yet.
 */
encoder_discovery_finished: boolean, 
/**
 * The H.264 encoder that conversion uses. None when none works.
 */
video_encoder: VideoEncoder | null, }`,signature:{properties:[{key:`ffmpeg`,value:{name:`union`,raw:`FfmpegBuild | null`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * The path of the ffmpeg executable.
 */
path: string, 
/**
 * The version that \`ffmpeg -version\` reports, such as \`8.1.2\`.
 */
version: string, 
/**
 * True when the server was given an ffmpeg directory, and false when it searched the usual places.
 */
is_custom: boolean, }`,signature:{properties:[{key:`path`,value:{name:`string`,required:!0},description:`The path of the ffmpeg executable.`},{key:`version`,value:{name:`string`,required:!0},description:"The version that `ffmpeg -version` reports, such as `8.1.2`."},{key:`is_custom`,value:{name:`boolean`,required:!0},description:`True when the server was given an ffmpeg directory, and false when it searched the usual places.`}]}},{name:`null`}],required:!0},description:`None when the server has no conversion service (no ffmpeg found or no cache directory).`},{key:`encoder_discovery_finished`,value:{name:`boolean`,required:!0},description:"Whether encoder discovery has finished. While false, `video_encoder` is not known yet."},{key:`video_encoder`,value:{name:`union`,raw:`VideoEncoder | null`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * The ffmpeg encoder name, such as \`h264_videotoolbox\` or \`libx264\`.
 */
name: string, 
/**
 * Whether the encoder runs on the processor rather than on video hardware.
 */
software: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0},description:"The ffmpeg encoder name, such as `h264_videotoolbox` or `libx264`."},{key:`software`,value:{name:`boolean`,required:!0},description:`Whether the encoder runs on the processor rather than on video hardware.`}]}},{name:`null`}],required:!0},description:`The H.264 encoder that conversion uses. None when none works.`}]},required:!0}}]}}]},description:``},choice:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  canChoose: boolean;
  isSaving: boolean;
  failure: string | null;
}`,signature:{properties:[{key:`canChoose`,value:{name:`boolean`,required:!0}},{key:`isSaving`,value:{name:`boolean`,required:!0}},{key:`failure`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}}]}},description:``},onChoose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onUseBundled:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}function O({ffmpegBuild:e,isScrollTarget:t=!1}){return(0,j.jsxs)(`section`,{ref:t?A:void 0,"aria-labelledby":M,className:`flex scroll-mt-4 flex-col gap-3`,children:[(0,j.jsx)(`h3`,{id:M,className:`text-base font-semibold`,children:`Media conversion`}),(0,j.jsx)(g,{preferenceKey:`losslessAudio`,label:`Keep audio lossless when converting`,hint:`Converted audio keeps its full quality but takes more disk space.`}),(0,j.jsx)(k,{}),e!==null&&(0,j.jsx)(S,{...e})]})}function k(){let e=d(),t=f(u(`videoQuality`)),n=N.find(e=>e.value===t)?.value??`balanced`;return(0,j.jsx)(s,{label:`Quality of converted video`,className:`max-w-xs`,value:n,options:N,hint:`Higher quality makes converted video take more space in the media cache.`,onChange:t=>e(l.preferenceSet(`videoQuality`,t.target.value))})}function A(e){e?.scrollIntoView?.({block:`start`})}var j,M,N;function P(){return(P=e((()=>{c(),o(),p(),m(),D(),h(),j=t(),M=`settings-media-conversion`,N=[{value:`compact`,label:`Smaller files`},{value:`balanced`,label:`Balanced`},{value:`best`,label:`Best picture`}],O.__docgenInfo={description:`How media is converted: whether audio stays lossless, the quality of converted video, and on the desktop app the ffmpeg build.
Opened for this section, Settings scroll to it.`,methods:[],displayName:`MediaConversionSection`,props:{ffmpegBuild:{required:!0,tsType:{name:`union`,raw:`FfmpegBuildControls | null`,elements:[{name:`signature`,type:`object`,raw:`{
  capabilities: ConversionCapabilitiesView;
  choice: FfmpegBuildChoiceView;
  onChoose: () => void;
  onUseBundled: () => void;
}`,signature:{properties:[{key:`capabilities`,value:{name:`union`,raw:`| { kind: "loading" }
| { kind: "failed"; message: string }
| { kind: "loaded"; capabilities: ConversionCapabilities }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: "loading" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"loading"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "failed"; message: string }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"failed"`,required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "loaded"; capabilities: ConversionCapabilities }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"loaded"`,required:!0}},{key:`capabilities`,value:{name:`signature`,type:`object`,raw:`{ 
/**
 * None when the server has no conversion service (no ffmpeg found or no cache directory).
 */
ffmpeg: FfmpegBuild | null, 
/**
 * Whether encoder discovery has finished. While false, \`video_encoder\` is not known yet.
 */
encoder_discovery_finished: boolean, 
/**
 * The H.264 encoder that conversion uses. None when none works.
 */
video_encoder: VideoEncoder | null, }`,signature:{properties:[{key:`ffmpeg`,value:{name:`union`,raw:`FfmpegBuild | null`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * The path of the ffmpeg executable.
 */
path: string, 
/**
 * The version that \`ffmpeg -version\` reports, such as \`8.1.2\`.
 */
version: string, 
/**
 * True when the server was given an ffmpeg directory, and false when it searched the usual places.
 */
is_custom: boolean, }`,signature:{properties:[{key:`path`,value:{name:`string`,required:!0},description:`The path of the ffmpeg executable.`},{key:`version`,value:{name:`string`,required:!0},description:"The version that `ffmpeg -version` reports, such as `8.1.2`."},{key:`is_custom`,value:{name:`boolean`,required:!0},description:`True when the server was given an ffmpeg directory, and false when it searched the usual places.`}]}},{name:`null`}],required:!0},description:`None when the server has no conversion service (no ffmpeg found or no cache directory).`},{key:`encoder_discovery_finished`,value:{name:`boolean`,required:!0},description:"Whether encoder discovery has finished. While false, `video_encoder` is not known yet."},{key:`video_encoder`,value:{name:`union`,raw:`VideoEncoder | null`,elements:[{name:`signature`,type:`object`,raw:`{ 
/**
 * The ffmpeg encoder name, such as \`h264_videotoolbox\` or \`libx264\`.
 */
name: string, 
/**
 * Whether the encoder runs on the processor rather than on video hardware.
 */
software: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0},description:"The ffmpeg encoder name, such as `h264_videotoolbox` or `libx264`."},{key:`software`,value:{name:`boolean`,required:!0},description:`Whether the encoder runs on the processor rather than on video hardware.`}]}},{name:`null`}],required:!0},description:`The H.264 encoder that conversion uses. None when none works.`}]},required:!0}}]}}],required:!0}},{key:`choice`,value:{name:`signature`,type:`object`,raw:`{
  canChoose: boolean;
  isSaving: boolean;
  failure: string | null;
}`,signature:{properties:[{key:`canChoose`,value:{name:`boolean`,required:!0}},{key:`isSaving`,value:{name:`boolean`,required:!0}},{key:`failure`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}}]},required:!0}},{key:`onChoose`,value:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}},required:!0}},{key:`onUseBundled`,value:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}},required:!0}}]}},{name:`null`}]},description:`The desktop app's ffmpeg build, or null where the app has none to choose.`},isScrollTarget:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}}}}})))()}export{P as n,O as t};