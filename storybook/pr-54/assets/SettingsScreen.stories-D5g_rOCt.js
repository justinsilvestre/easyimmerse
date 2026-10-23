import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{Wt as ee,t,yn as n}from"./src-C5CV-g-T.js";import{n as r,t as i}from"./withAppStore-p4nsSw0u.js";import{a}from"./routeSelectors-69hBoS-m.js";import{i as o,n as s,r as c,t as l}from"./useAppSelector-ECqnbLsu.js";import{t as u}from"./jsx-runtime-DeHZSEgm.js";import{n as d,t as f}from"./createLucideIcon-Dq46me9F.js";import{n as p,t as m}from"./book-open-DKzxMWbs.js";import{i as te,n as ne,r as h,t as g}from"./SettingsGroup-juL1siIz.js";import{n as _,t as v}from"./user-round-D1gwOYBP.js";import{n as y,t as b}from"./withDispatchedActions-BuB2eJQI.js";import{r as x,t as S}from"./CloudStorageSection-BlKPD7Bf.js";import{n as re,t as ie}from"./selectLoginState-BHBYlsGh.js";import{n as ae,t as oe}from"./ConversionCacheSection-DSRCRjU5.js";import{n as se,t as ce}from"./DisplaySection-BY7z9jgn.js";import{n as le,t as ue}from"./LicensesPage-iuo6CI0F.js";import{n as de,t as fe}from"./ScreenLayout-BmeiqmvB.js";import{n as C,t as w}from"./SettingsPageButton-SrCxMWrw.js";import{n as T,t as E}from"./SuggestionsSection-DmWMFj0z.js";import{n as D,t as O}from"./MediaConversionSection-iGh5vF4o.js";import{n as k,t as A}from"./SubtitleAppearanceSection-DQA44pXV.js";import{n as j,t as M}from"./ServerSection-ShPsVOkJ.js";var N,P;function F(){return(F=e((()=>{d(),N={name:`wifi`,size:24,node:[[`path`,{d:`M12 20h.01`,key:`zekei9`}],[`path`,{d:`M2 8.82a15 15 0 0 1 20 0`,key:`dnpr2z`}],[`path`,{d:`M5 12.859a10 10 0 0 1 14 0`,key:`1x1e6c`}],[`path`,{d:`M8.5 16.429a5 5 0 0 1 7 0`,key:`1bycff`}]]},N.node,P=f(N)})))()}function I(){let e=o();return(0,L.jsx)(w,{icon:(0,L.jsx)(h,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Help`,description:`Opens the easyImmerse project page in your browser.`,isExternal:!0,onClick:()=>e(n.externalLinkRequested(R))})}var L,R;function z(){return(z=e((()=>{t(),te(),c(),C(),L=u(),R=`https://github.com/justinsilvestre/easyimmerse`,I.__docgenInfo={description:`The Help row of Settings, which opens the project's page outside the app.`,methods:[],displayName:`HelpRow`}})))()}function B({onBack:e,onOpenAccount:t,onOpenDictionaries:r,conversionCache:i=H,ffmpegBuild:c=null,licenseNotices:l={status:`loaded`,groups:[]}}){let u=o(),d=s(ee)===`desktop`,f=s(a),p=s(re);return(0,V.jsxs)(fe,{onBack:e,children:[(0,V.jsx)(`h1`,{className:`text-xl font-semibold`,children:`Settings`}),(0,V.jsxs)(g,{title:`Sync`,children:[(0,V.jsx)(w,{icon:(0,V.jsx)(v,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Account`,description:U[p],onClick:t}),(0,V.jsx)(w,{icon:(0,V.jsx)(P,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Local network sync`,description:W[d?`desktop`:`elsewhere`],onClick:()=>u(n.navigated({type:`openPairing`}))}),d&&(0,V.jsx)(M,{}),(0,V.jsx)(S,{})]}),(0,V.jsxs)(g,{title:`This device`,children:[(0,V.jsx)(ce,{}),(0,V.jsx)(w,{icon:(0,V.jsx)(m,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Dictionaries`,description:`Add and remove the dictionaries words are looked up in.`,onClick:r}),(0,V.jsx)(A,{}),(0,V.jsx)(O,{ffmpegBuild:c,isScrollTarget:f===`mediaConversion`}),(0,V.jsx)(oe,{...i}),(0,V.jsx)(E,{})]}),(0,V.jsxs)(g,{title:`About`,children:[(0,V.jsx)(ue,{notices:l}),(0,V.jsx)(I,{})]})]})}var V,H,U,W;function G(){return(G=e((()=>{t(),p(),_(),F(),x(),ie(),ae(),se(),z(),le(),de(),ne(),C(),T(),D(),c(),l(),k(),j(),V=u(),H={cache:{kind:`unavailable`},onClear:()=>void 0,clearStatus:``,onBudgetChange:()=>void 0},U={loggedIn:`The account you are logged in to, and the devices it is used on.`,loggedOut:`You are not logged in. Log in or sign up to back up your work and use it on your other devices.`,unknown:`Log in to an account, or see the one you are logged in to.`},W={desktop:`Pair your other devices on this network with this computer.`,elsewhere:`Pair this device with the easyImmerse desktop app on a computer on this network.`},B.__docgenInfo={description:``,methods:[],displayName:`SettingsScreen`,props:{onBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Closes Settings to the screen beneath, whichever it is, so its button says only Back.`},onOpenAccount:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onOpenDictionaries:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},conversionCache:{required:!1,tsType:{name:`signature`,type:`object`,raw:`{
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
| { status: "failed" }`,elements:[{name:`signature`,type:`object`,raw:`{ status: "loading" }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"loading"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: "loaded"; groups: readonly LicenseNoticeGroup[] }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"loaded"`,required:!0}},{key:`groups`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: "failed" }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"failed"`,required:!0}}]}}]},description:``,defaultValue:{value:`{ status: "loaded", groups: [] }`,computed:!1}}}}})))()}var K,q,J,Y,X,Z,Q;function $(){return($=e((()=>{t(),i(),b(),G(),{fn:K}=__STORYBOOK_MODULE_TEST__,q={title:`Screens/SettingsScreen`,component:B,decorators:[r],parameters:{layout:`fullscreen`},args:{onBack:K(),onOpenAccount:K(),onOpenDictionaries:K()}},J={},Y={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:123e7,limit_bytes:5e9,budget_bytes:5e9,free_bytes:4e10,space_low:!1,chosen_budget_bytes:null}},onClear:K(),onBudgetChange:K(),clearStatus:``},licenseNotices:{status:`loaded`,groups:[{title:`FFmpeg`,notices:[{title:`ffmpeg (LGPL build) — notice`,text:`Version and origin.`}]}]}}},X={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:19e8,limit_bytes:2e9,budget_bytes:5e9,free_bytes:22e8,space_low:!0,chosen_budget_bytes:null}},onClear:K(),onBudgetChange:K(),clearStatus:`Cleared 300 MB.`}}},Z={parameters:{appStore:{server:{serverUrl:`http://127.0.0.1:5000`,token:`t`,bundledIn:`desktop`}}},decorators:[y(n.desktopServerStatusReceived({state:{kind:`running`},urls:[`http://192.168.1.5:8787`],lan_reachable:!0,serves_web_app:!0,pairing_url:`http://192.168.1.5:8787`}),n.desktopServerSettingsLoaded({bind:`0.0.0.0:8787`,auth:`launch_token`,open_signup:!1,api_only:!1,autostart:!0,ffmpeg_dir:null,expected_hosts:[]}),n.desktopServerLogsReceived([]))],args:{ffmpegBuild:{capabilities:{kind:`loaded`,capabilities:{ffmpeg:{path:`/Applications/easyImmerse.app/Contents/MacOS/easyimmerse-ffmpeg`,version:`8.1.2`,is_custom:!1},encoder_discovery_finished:!0,video_encoder:{name:`h264_videotoolbox`,software:!1}}},choice:{canChoose:!0,isSaving:!1,failure:null},onChoose:K(),onUseBundled:K()}}},Q=[`WithoutConversion`,`WithConvertedVideos`,`LowDiskSpace`,`OnDesktop`]})))()}$();export{X as LowDiskSpace,Z as OnDesktop,Y as WithConvertedVideos,J as WithoutConversion,Q as __namedExportsOrder,q as default};