import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{Pt as t,fn as n,t as r}from"./src-aHKPfv9v.js";import{n as i,t as a}from"./withAppStore-uXY6wbAP.js";import{i as o}from"./routeSelectors-Bv16dAHJ.js";import{n as s,t as c}from"./useAppSelector-C7fjNPYH.js";import{t as l}from"./jsx-runtime-DeHZSEgm.js";import{n as u,t as d}from"./book-open-Dt3AVjBA.js";import{n as f,t as p}from"./chevron-right-BAsSErj3.js";import{i as m,r as h}from"./CloudMenu-CTqLdY7E.js";import{n as g,t as _}from"./withDispatchedActions-elKLa5xk.js";import{r as v,t as y}from"./CloudStorageSection-B-y1OEbn.js";import{n as b,t as x}from"./selectLoginState-D9QMWauC.js";import{n as S,t as C}from"./ConversionCacheSection-C3ad4v5q.js";import{n as w,t as T}from"./LicensesPage-D2HthUAu.js";import{n as E,t as D}from"./ScreenLayout-Zo8DQBR8.js";import{n as O,t as k}from"./MediaConversionSection-Cf9O2Mwq.js";import{n as A,t as j}from"./SubtitleAppearanceSection-DbfPPCfn.js";import{n as M,t as N}from"./ServerSection--gJLK5tj.js";function P({icon:e,label:t,description:n,onClick:r}){return(0,F.jsxs)(`button`,{type:`button`,onClick:r,className:`flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent`,children:[e,(0,F.jsxs)(`span`,{className:`flex flex-1 flex-col`,children:[(0,F.jsx)(`span`,{className:`font-medium`,children:t}),(0,F.jsx)(`span`,{className:`text-sm text-fg-muted`,children:n})]}),(0,F.jsx)(p,{className:`size-4 text-fg-muted`,"aria-hidden":!0})]})}var F;function I(){return(I=e((()=>{f(),F=l(),P.__docgenInfo={description:`A row of the general settings that opens another settings page, with an icon, the page's name and what it holds.`,methods:[],displayName:`SettingsPageButton`,props:{icon:{required:!0,tsType:{name:`ReactNode`},description:``},label:{required:!0,tsType:{name:`string`},description:``},description:{required:!0,tsType:{name:`string`},description:``},onClick:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}function L({onBack:e,onOpenAccount:n,onOpenDictionaries:r,conversionCache:i=z,ffmpegBuild:a=null,licenseNotices:c={status:`loaded`,groups:[]}}){let l=s(t)===`desktop`,u=s(o),f=s(b);return(0,R.jsxs)(D,{onBack:e,children:[(0,R.jsx)(`h1`,{className:`text-xl font-semibold`,children:`Settings`}),(0,R.jsx)(P,{icon:(0,R.jsx)(h,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Account`,description:B[f],onClick:n}),(0,R.jsx)(y,{}),l&&(0,R.jsx)(N,{}),(0,R.jsx)(P,{icon:(0,R.jsx)(d,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Dictionaries`,description:`Add and remove the dictionaries words are looked up in.`,onClick:r}),(0,R.jsx)(j,{}),(0,R.jsx)(k,{ffmpegBuild:a,isScrollTarget:u===`mediaConversion`}),(0,R.jsx)(C,{...i}),(0,R.jsx)(T,{notices:c})]})}var R,z,B;function V(){return(V=e((()=>{r(),u(),m(),v(),x(),S(),w(),E(),I(),O(),c(),A(),M(),R=l(),z={cache:{kind:`unavailable`},onClear:()=>void 0,clearStatus:``,onBudgetChange:()=>void 0},B={loggedIn:`The account you are logged in to, and the devices it is used on.`,loggedOut:`You are not logged in. Log in or sign up to back up your work and use it on your other devices.`,unknown:`Log in to an account, or see the one you are logged in to.`},L.__docgenInfo={description:``,methods:[],displayName:`SettingsScreen`,props:{onBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Closes Settings to the screen beneath, whichever it is, so its button says only Back.`},onOpenAccount:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onOpenDictionaries:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},conversionCache:{required:!1,tsType:{name:`signature`,type:`object`,raw:`{
  cache: ConversionCacheView;
  onClear: () => void;
  /** What the last clearing did, shown beside the button. Empty before any clearing. */
  clearStatus: string;
  /** Sets how large the cache may grow, or null to let it follow the disk's size. */
  onBudgetChange: (budgetBytes: number | null) => void;
}`,signature:{properties:[{key:`cache`,value:{name:`union`,raw:`| { kind: "loading" }
/** No server, or a server without a conversion service. */
| { kind: "unavailable" }
| { kind: "failed"; message: string }
| { kind: "available"; status: ConversionCacheStatus }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: "loading" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"loading"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "unavailable" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"unavailable"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "failed"; message: string }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"failed"`,required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: "available"; status: ConversionCacheStatus }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"available"`,required:!0}},{key:`status`,value:{name:`signature`,type:`object`,raw:`{ usage_bytes: number, 
/**
 * The size the cache may currently grow to: the budget, reduced when free space is short.
 */
limit_bytes: number, 
/**
 * The size the cache may grow to when disk space allows.
 */
budget_bytes: number, free_bytes: number, 
/**
 * True when free disk space, not the budget, limits the cache.
 */
space_low: boolean, 
/**
 * The budget the user chose, or None while the budget follows the disk's size.
 */
chosen_budget_bytes: number | null, }`,signature:{properties:[{key:`usage_bytes`,value:{name:`number`,required:!0}},{key:`limit_bytes`,value:{name:`number`,required:!0},description:`The size the cache may currently grow to: the budget, reduced when free space is short.`},{key:`budget_bytes`,value:{name:`number`,required:!0},description:`The size the cache may grow to when disk space allows.`},{key:`free_bytes`,value:{name:`number`,required:!0}},{key:`space_low`,value:{name:`boolean`,required:!0},description:`True when free disk space, not the budget, limits the cache.`},{key:`chosen_budget_bytes`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!0},description:`The budget the user chose, or None while the budget follows the disk's size.`}]},required:!0}}]}}],required:!0}},{key:`onClear`,value:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}},required:!0}},{key:`clearStatus`,value:{name:`string`,required:!0},description:`What the last clearing did, shown beside the button. Empty before any clearing.`},{key:`onBudgetChange`,value:{name:`signature`,type:`function`,raw:`(budgetBytes: number | null) => void`,signature:{arguments:[{type:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},name:`budgetBytes`}],return:{name:`void`}},required:!0},description:`Sets how large the cache may grow, or null to let it follow the disk's size.`}]}},description:``,defaultValue:{value:`{
  cache: { kind: "unavailable" },
  onClear: () => undefined,
  clearStatus: "",
  onBudgetChange: () => undefined,
}`,computed:!1}},ffmpegBuild:{required:!1,tsType:{name:`union`,raw:`FfmpegBuildControls | null`,elements:[{name:`signature`,type:`object`,raw:`{
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
}`,signature:{properties:[{key:`canChoose`,value:{name:`boolean`,required:!0}},{key:`isSaving`,value:{name:`boolean`,required:!0}},{key:`failure`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}}]},required:!0}},{key:`onChoose`,value:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}},required:!0}},{key:`onUseBundled`,value:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}},required:!0}}]}},{name:`null`}]},description:`The desktop app's ffmpeg build, or null where the app has none to choose.`,defaultValue:{value:`null`,computed:!1}},licenseNotices:{required:!1,tsType:{name:`union`,raw:`| { status: "loading" }
| { status: "loaded"; groups: readonly LicenseNoticeGroup[] }
| { status: "failed" }`,elements:[{name:`signature`,type:`object`,raw:`{ status: "loading" }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"loading"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: "loaded"; groups: readonly LicenseNoticeGroup[] }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"loaded"`,required:!0}},{key:`groups`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: "failed" }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"failed"`,required:!0}}]}}]},description:``,defaultValue:{value:`{ status: "loaded", groups: [] }`,computed:!1}}}}})))()}var H,U,W,G,K,q,J;function Y(){return(Y=e((()=>{r(),a(),_(),V(),{fn:H}=__STORYBOOK_MODULE_TEST__,U={title:`Screens/SettingsScreen`,component:L,decorators:[i],parameters:{layout:`fullscreen`},args:{onBack:H(),onOpenAccount:H(),onOpenDictionaries:H()}},W={},G={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:123e7,limit_bytes:5e9,budget_bytes:5e9,free_bytes:4e10,space_low:!1,chosen_budget_bytes:null}},onClear:H(),onBudgetChange:H(),clearStatus:``},licenseNotices:{status:`loaded`,groups:[{title:`FFmpeg`,notices:[{title:`ffmpeg (LGPL build) — notice`,text:`Version and origin.`}]}]}}},K={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:19e8,limit_bytes:2e9,budget_bytes:5e9,free_bytes:22e8,space_low:!0,chosen_budget_bytes:null}},onClear:H(),onBudgetChange:H(),clearStatus:`Cleared 300 MB.`}}},q={parameters:{appStore:{server:{serverUrl:`http://127.0.0.1:5000`,token:`t`,bundledIn:`desktop`}}},decorators:[g(n.desktopServerStatusReceived({state:{kind:`running`},urls:[`http://192.168.1.5:8787`],lan_reachable:!0,serves_web_app:!0,pairing_url:`http://192.168.1.5:8787`}),n.desktopServerSettingsLoaded({bind:`0.0.0.0:8787`,auth:`launch_token`,open_signup:!1,api_only:!1,autostart:!0,ffmpeg_dir:null,expected_hosts:[]}),n.desktopServerLogsReceived([]))],args:{ffmpegBuild:{capabilities:{kind:`loaded`,capabilities:{ffmpeg:{path:`/Applications/easyImmerse.app/Contents/MacOS/easyimmerse-ffmpeg`,version:`8.1.2`,is_custom:!1},encoder_discovery_finished:!0,video_encoder:{name:`h264_videotoolbox`,software:!1}}},choice:{canChoose:!0,isSaving:!1,failure:null},onChoose:H(),onUseBundled:H()}}},J=[`WithoutConversion`,`WithConvertedVideos`,`LowDiskSpace`,`OnDesktop`]})))()}Y();export{K as LowDiskSpace,q as OnDesktop,G as WithConvertedVideos,W as WithoutConversion,J as __namedExportsOrder,U as default};