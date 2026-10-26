import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./createLucideIcon-BUEDjTIZ.js";import{n as i,t as ee}from"./book-open-B1_HAjyY.js";import{i as a,n as o,r as s,t as c}from"./SettingsGroup-Ckaxss8j.js";import{n as l,t as u}from"./user-round-C77l4lbW.js";import{Kt as d,t as f,xn as p}from"./src-DmNNPGis.js";import{n as te,t as ne}from"./withAppStore-jcHZiOXj.js";import{a as re}from"./routeSelectors-NR49n0mf.js";import{i as m,n as h,r as g,t as ie}from"./useAppSelector-Bwfk7_FC.js";import{n as ae,t as _}from"./withDispatchedActions-CCbiWK3n.js";import{n as v,t as y}from"./selectLoginState-BhN4qy7c.js";import{n as b,t as x}from"./ScreenLayout-k9Q_7zoz.js";import{r as S,t as C}from"./CloudStorageSection-DIgTYFae.js";import{n as w,t as oe}from"./ConversionCacheSection-C7VhSnf6.js";import{n as se,t as ce}from"./DisplaySection-CIoG5-fK.js";import{n as le,t as ue}from"./LicensesPage-DoIbTNxa.js";import{n as de,t as fe}from"./MediaConversionSection-E1oCcDVo.js";import{n as T,t as E}from"./SettingsPageButton-tb0zy4HA.js";import{n as pe,t as D}from"./SubtitleAppearanceSection-CCXNv_fe.js";import{n as O,t as k}from"./SuggestionsSection-DYXCILVG.js";var A,j;function M(){return(M=e((()=>{n(),A={name:`server`,size:24,node:[[`rect`,{width:`20`,height:`8`,x:`2`,y:`2`,rx:`2`,ry:`2`,key:`ngkwjq`}],[`rect`,{width:`20`,height:`8`,x:`2`,y:`14`,rx:`2`,ry:`2`,key:`iecqi9`}],[`line`,{x1:`6`,x2:`6.01`,y1:`6`,y2:`6`,key:`16zg32`}],[`line`,{x1:`6`,x2:`6.01`,y1:`18`,y2:`18`,key:`nzw8ys`}]]},A.node,j=r(A)})))()}var N,P;function F(){return(F=e((()=>{n(),N={name:`wifi`,size:24,node:[[`path`,{d:`M12 20h.01`,key:`zekei9`}],[`path`,{d:`M2 8.82a15 15 0 0 1 20 0`,key:`dnpr2z`}],[`path`,{d:`M5 12.859a10 10 0 0 1 14 0`,key:`1x1e6c`}],[`path`,{d:`M8.5 16.429a5 5 0 0 1 7 0`,key:`1bycff`}]]},N.node,P=r(N)})))()}function I(){let e=m();return(0,L.jsx)(E,{icon:(0,L.jsx)(s,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Help`,description:`Opens the easyImmerse project page in your browser.`,isExternal:!0,onClick:()=>e(p.externalLinkRequested(R))})}var L,R;function z(){return(z=e((()=>{f(),a(),g(),T(),L=t(),R=`https://github.com/justinsilvestre/easyimmerse`,I.__docgenInfo={description:`The Help row of Settings, which opens the project's page outside the app.`,methods:[],displayName:`HelpRow`}})))()}function B({onBack:e,onOpenAccount:t,onOpenDictionaries:n,conversionCache:r=H,ffmpegBuild:i=null,licenseNotices:a={status:`loaded`,groups:[]}}){let o=m(),s=h(d)===`desktop`,l=h(re),f=h(v);return(0,V.jsxs)(x,{onBack:e,children:[(0,V.jsx)(`h1`,{className:`text-xl font-semibold`,children:`Settings`}),(0,V.jsxs)(c,{title:`Sync`,children:[(0,V.jsx)(E,{icon:(0,V.jsx)(u,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Account`,description:U[f],onClick:t}),(0,V.jsx)(E,{icon:(0,V.jsx)(P,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Local network sync`,description:W[s?`desktop`:`elsewhere`],onClick:()=>o(p.navigated({type:`openPairing`}))}),s&&(0,V.jsx)(E,{icon:(0,V.jsx)(j,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Server`,description:`Start and stop the server other devices reach, name this computer, and choose who may sign in.`,onClick:()=>o(p.navigated({type:`openServerSettings`}))}),(0,V.jsx)(C,{})]}),(0,V.jsxs)(c,{title:`This device`,children:[(0,V.jsx)(ce,{}),(0,V.jsx)(E,{icon:(0,V.jsx)(ee,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),label:`Dictionaries`,description:`Add and remove the dictionaries words are looked up in.`,onClick:n}),(0,V.jsx)(D,{}),(0,V.jsx)(fe,{ffmpegBuild:i,isScrollTarget:l===`mediaConversion`}),(0,V.jsx)(oe,{...r}),(0,V.jsx)(k,{})]}),(0,V.jsxs)(c,{title:`About`,children:[(0,V.jsx)(ue,{notices:a}),(0,V.jsx)(I,{})]})]})}var V,H,U,W;function G(){return(G=e((()=>{f(),i(),M(),l(),F(),b(),y(),g(),ie(),S(),w(),se(),z(),le(),de(),o(),T(),pe(),O(),V=t(),H={cache:{kind:`unavailable`},onClear:()=>void 0,clearStatus:``,onBudgetChange:()=>void 0},U={loggedIn:`The account you are logged in to, and the devices it is used on.`,loggedOut:`You are not logged in. Log in or sign up to back up your work and use it on your other devices.`,unknown:`Log in to an account, or see the one you are logged in to.`},W={desktop:`Pair your other devices on this network with this computer.`,elsewhere:`Pair this device with the easyImmerse desktop app on a computer on this network.`},B.__docgenInfo={description:``,methods:[],displayName:`SettingsScreen`,props:{onBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Closes Settings to the screen beneath, whichever it is, so its button says only Back.`},onOpenAccount:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onOpenDictionaries:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},conversionCache:{required:!1,tsType:{name:`signature`,type:`object`,raw:`{
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
| { status: "failed" }`,elements:[{name:`signature`,type:`object`,raw:`{ status: "loading" }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"loading"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: "loaded"; groups: readonly LicenseNoticeGroup[] }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"loaded"`,required:!0}},{key:`groups`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: "failed" }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"failed"`,required:!0}}]}}]},description:``,defaultValue:{value:`{ status: "loaded", groups: [] }`,computed:!1}}}}})))()}var K,q,J,Y,X,Z,Q;function $(){return($=e((()=>{f(),ne(),_(),G(),{fn:K}=__STORYBOOK_MODULE_TEST__,q={title:`Screens/Settings/SettingsScreen`,component:B,decorators:[te],parameters:{layout:`fullscreen`},args:{onBack:K(),onOpenAccount:K(),onOpenDictionaries:K()}},J={},Y={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:123e7,limit_bytes:5e9,budget_bytes:5e9,free_bytes:4e10,space_low:!1,chosen_budget_bytes:null}},onClear:K(),onBudgetChange:K(),clearStatus:``},licenseNotices:{status:`loaded`,groups:[{title:`FFmpeg`,notices:[{title:`ffmpeg (LGPL build) — notice`,text:`Version and origin.`}]}]}}},X={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:19e8,limit_bytes:2e9,budget_bytes:5e9,free_bytes:22e8,space_low:!0,chosen_budget_bytes:null}},onClear:K(),onBudgetChange:K(),clearStatus:`Cleared 300 MB.`}}},Z={parameters:{appStore:{server:{serverUrl:`http://127.0.0.1:5000`,token:`t`,bundledIn:`desktop`}}},decorators:[ae(p.desktopServerStatusReceived({state:{kind:`running`},urls:[`http://192.168.1.5:8787`],lan_reachable:!0,serves_web_app:!0,pairing_url:`http://192.168.1.5:8787`}),p.desktopServerSettingsLoaded({bind:`0.0.0.0:8787`,auth:`launch_token`,open_signup:!1,api_only:!1,autostart:!0,ffmpeg_dir:null,expected_hosts:[],device_name:`Studio iMac`}),p.desktopServerLogsReceived([]))],args:{ffmpegBuild:{capabilities:{kind:`loaded`,capabilities:{ffmpeg:{path:`/Applications/easyImmerse.app/Contents/MacOS/easyimmerse-ffmpeg`,version:`8.1.2`,is_custom:!1},encoder_discovery_finished:!0,video_encoder:{name:`h264_videotoolbox`,software:!1}}},choice:{canChoose:!0,isSaving:!1,failure:null},onChoose:K(),onUseBundled:K()}}},Q=[`WithoutConversion`,`WithConvertedVideos`,`LowDiskSpace`,`OnDesktop`]})))()}$();export{X as LowDiskSpace,Z as OnDesktop,Y as WithConvertedVideos,J as WithoutConversion,Q as __namedExportsOrder,q as default};