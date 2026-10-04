import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./Button-BGoles7M.js";import{n as i,t as a}from"./ConversionCacheSection-DoPFa6YQ.js";import{i as o,r as s}from"./useAppDispatch-CqDunE9r.js";import{n as c,t as l}from"./LicensesPage-B-hXsT1J.js";import{n as u,t as d}from"./PreferenceToggle-B1TLMpGO.js";import{n as f,t as p}from"./ScreenLayout-ZBCh9ZvW.js";function m({onBack:e,conversionCache:t=g,licenseNotices:n=[]}){return(0,h.jsxs)(p,{headerActions:(0,h.jsx)(r,{onClick:e,children:`Back`}),showSettingsLink:!1,children:[(0,h.jsx)(`h1`,{className:`text-xl font-semibold`,children:`Settings`}),(0,h.jsxs)(`section`,{"aria-labelledby":`settings-conversion`,className:`flex flex-col gap-3`,children:[(0,h.jsx)(`h2`,{id:`settings-conversion`,className:`text-base font-semibold`,children:`Conversion`}),(0,h.jsx)(d,{preferenceKey:`losslessAudio`,label:`Keep audio lossless when converting`,hint:`Converted audio keeps its full quality but takes more disk space.`})]}),(0,h.jsx)(a,{...t}),(0,h.jsx)(l,{notices:n})]})}var h,g;function _(){return(_=e((()=>{n(),i(),c(),u(),f(),h=t(),g={cache:{kind:`unavailable`},onClear:()=>void 0,clearStatus:``},m.__docgenInfo={description:``,methods:[],displayName:`SettingsScreen`,props:{onBack:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},conversionCache:{required:!1,tsType:{name:`signature`,type:`object`,raw:`{
  cache: ConversionCacheView;
  onClear: () => void;
  /** What the last clearing did, shown beside the button. Empty before any clearing. */
  clearStatus: string;
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
space_low: boolean, }`,signature:{properties:[{key:`usage_bytes`,value:{name:`number`,required:!0}},{key:`limit_bytes`,value:{name:`number`,required:!0},description:`The size the cache may currently grow to: the budget, reduced when free space is short.`},{key:`budget_bytes`,value:{name:`number`,required:!0},description:`The size the cache may grow to when disk space allows.`},{key:`free_bytes`,value:{name:`number`,required:!0}},{key:`space_low`,value:{name:`boolean`,required:!0},description:`True when free disk space, not the budget, limits the cache.`}]},required:!0}}]}}],required:!0}},{key:`onClear`,value:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}},required:!0}},{key:`clearStatus`,value:{name:`string`,required:!0},description:`What the last clearing did, shown beside the button. Empty before any clearing.`}]}},description:``,defaultValue:{value:`{
  cache: { kind: "unavailable" },
  onClear: () => undefined,
  clearStatus: "",
}`,computed:!1}},licenseNotices:{required:!1,tsType:{name:`unknown`},description:``,defaultValue:{value:`[]`,computed:!1}}}}})))()}var v,y,b,x,S,C;function w(){return(w=e((()=>{s(),_(),{fn:v}=__STORYBOOK_MODULE_TEST__,y={title:`Screens/SettingsScreen`,component:m,decorators:[o],parameters:{layout:`fullscreen`},args:{onBack:v()}},b={},x={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:123e7,limit_bytes:5e9,budget_bytes:5e9,free_bytes:4e10,space_low:!1}},onClear:v(),clearStatus:``},licenseNotices:[{title:`ffmpeg (LGPL build) — notice`,text:`Version and origin.`}]}},S={args:{conversionCache:{cache:{kind:`available`,status:{usage_bytes:19e8,limit_bytes:2e9,budget_bytes:5e9,free_bytes:22e8,space_low:!0}},onClear:v(),clearStatus:`Cleared 300 MB.`}}},C=[`WithoutConversion`,`WithConvertedVideos`,`LowDiskSpace`]})))()}w();export{S as LowDiskSpace,x as WithConvertedVideos,b as WithoutConversion,C as __namedExportsOrder,y as default};