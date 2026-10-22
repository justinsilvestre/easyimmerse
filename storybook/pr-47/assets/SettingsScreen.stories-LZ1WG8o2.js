import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{Yt as t,t as n}from"./src-iTCT1KQn.js";import{i as r,r as i}from"./NoticeRegion-CO6290qj.js";import{n as a,t as o}from"./withAppStore-BThyurVz.js";import{i as s}from"./routeSelectors-BE4VQ_n1.js";import{n as c}from"./serverSelectors-Cv_vlIEE.js";import{t as l}from"./jsx-runtime-DeHZSEgm.js";import{n as u,t as d}from"./book-open-B4DyLjij.js";import{n as f,t as p}from"./chevron-right-CSGP60BM.js";import{n as m,t as h}from"./withDispatchedActions-ByAAI-o8.js";import{n as g,t as _}from"./AccountSection-CZS1JkJL.js";import{n as v,t as y}from"./ConversionCacheSection-23EunJv4.js";import{n as b,t as x}from"./LicensesPage-O089LG_W.js";import{n as S,t as C}from"./ScreenLayout-DzTXvQPV.js";import{n as w,t as T}from"./MediaConversionSection-CphrrH0R.js";import{n as E,t as D}from"./SubtitleAppearanceSection-_ONOcFGS.js";import{i as O,n as k,r as A,t as j}from"./ServerSection-Dzzdla79.js";function M({onBack:e,onOpenDictionaries:t,conversionCache:n=P,ffmpegBuild:i=null,licenseNotices:a={status:`loaded`,groups:[]}}){let o=r(c)===`desktop`,l=r(s);return(0,N.jsxs)(C,{onBack:e,children:[(0,N.jsx)(`h1`,{className:`text-xl font-semibold`,children:`Settings`}),(0,N.jsx)(`div`,{id:A,className:`scroll-mt-4`,children:(0,N.jsx)(_,{})}),o&&(0,N.jsx)(j,{}),(0,N.jsxs)(`button`,{type:`button`,onClick:t,className:`flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent`,children:[(0,N.jsx)(d,{className:`size-4 text-fg-muted`,"aria-hidden":!0}),(0,N.jsxs)(`span`,{className:`flex flex-1 flex-col`,children:[(0,N.jsx)(`span`,{className:`font-medium`,children:`Dictionaries`}),(0,N.jsx)(`span`,{className:`text-sm text-fg-muted`,children:`Add and remove the dictionaries words are looked up in.`})]}),(0,N.jsx)(p,{className:`size-4 text-fg-muted`,"aria-hidden":!0})]}),(0,N.jsx)(D,{}),(0,N.jsx)(T,{ffmpegBuild:i,isScrollTarget:l===`mediaConversion`}),(0,N.jsx)(y,{...n}),(0,N.jsx)(x,{notices:a})]})}var N,P;function F(){return(F=e((()=>{n(),u(),f(),g(),v(),b(),S(),w(),i(),E(),O(),k(),N=l(),P={cache:{kind:`unavailable`},onClear:()=>void 0,clearStatus:``,onBudgetChange:()=>void 0},M.__docgenInfo={description:``,methods:[],displayName:`SettingsScreen`,props:{onBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Closes Settings to the screen beneath, whichever it is, so its button says only Back.`},onOpenDictionaries:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},conversionCache:{required:!1,tsType:{name:`signature`,type:`object`,raw:`{
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
| { status: "failed" }`,elements:[{name:`signature`,type:`object`,raw:`{ status: "loading" }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"loading"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: "loaded"; groups: readonly LicenseNoticeGroup[] }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"loaded"`,required:!0}},{key:`groups`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ status: "failed" }`,signature:{properties:[{key:`status`,value:{name:`literal`,value:`"failed"`,required:!0}}]}}]},description:``,defaultValue:{value:`{ status: "loaded", groups: [] }`,computed:!1}}}}})))()}var I,L,R,z,B,V,H;function U(){return(U=e((()=>{n(),o(),h(),F(),{fn:I}=__STORYBOOK_MODULE_TEST__,L={title:`Screens/SettingsScreen`,component:M,decorators:[a],parameters:{layout:`fullscreen`},args:{onBack:I(),onOpenDictionaries:I()}},R={},z={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:123e7,limit_bytes:5e9,budget_bytes:5e9,free_bytes:4e10,space_low:!1,chosen_budget_bytes:null}},onClear:I(),onBudgetChange:I(),clearStatus:``},licenseNotices:{status:`loaded`,groups:[{title:`FFmpeg`,notices:[{title:`ffmpeg (LGPL build) — notice`,text:`Version and origin.`}]}]}}},B={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:19e8,limit_bytes:2e9,budget_bytes:5e9,free_bytes:22e8,space_low:!0,chosen_budget_bytes:null}},onClear:I(),onBudgetChange:I(),clearStatus:`Cleared 300 MB.`}}},V={parameters:{appStore:{server:{serverUrl:`http://127.0.0.1:5000`,token:`t`,bundledIn:`desktop`}}},decorators:[m(t.desktopServerStatusReceived({state:{kind:`running`},urls:[`http://192.168.1.5:8787`],lan_reachable:!0,serves_web_app:!0,pairing_url:`http://192.168.1.5:8787`}),t.desktopServerSettingsLoaded({bind:`0.0.0.0:8787`,auth:`launch_token`,open_signup:!1,api_only:!1,autostart:!0,ffmpeg_dir:null,expected_hosts:[]}),t.desktopServerLogsReceived([]))],args:{ffmpegBuild:{capabilities:{kind:`loaded`,capabilities:{ffmpeg:{path:`/Applications/easyImmerse.app/Contents/MacOS/easyimmerse-ffmpeg`,version:`8.1.2`,is_custom:!1},encoder_discovery_finished:!0,video_encoder:{name:`h264_videotoolbox`,software:!1}}},choice:{canChoose:!0,isSaving:!1,failure:null},onChoose:I(),onUseBundled:I()}}},H=[`WithoutConversion`,`WithConvertedVideos`,`LowDiskSpace`,`OnDesktop`]})))()}U();export{B as LowDiskSpace,V as OnDesktop,z as WithConvertedVideos,R as WithoutConversion,H as __namedExportsOrder,L as default};