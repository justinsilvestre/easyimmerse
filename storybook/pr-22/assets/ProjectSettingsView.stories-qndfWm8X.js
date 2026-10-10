import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-BuE_96aE.js";import{n,t as r}from"./clsx-CTwy9ux-.js";import{t as i}from"./jsx-runtime-DeHZSEgm.js";import{n as a,t as o}from"./Button-KG4HKgfk.js";import{n as s,t as c}from"./CheckboxField-BHuU77av.js";import{n as l,t as u}from"./SelectField-DrmduWK2.js";import{B as ee,t as te}from"./src-MYOUxb_J.js";import{n as ne,t as re}from"./withAppStore-Cpb59x20.js";import{n as d,t as f}from"./createLucideIcon-B8p5rDQz.js";import{a as p,i as ie,n as ae,r as m}from"./flashcardFields-DEcp3TKu.js";import{n as oe,t as se}from"./ScreenLayout--sfU_etO.js";import{n as ce,t as le}from"./SegmentedControl-DJNAJVXt.js";import{n as ue,t as de}from"./TextField-BJ98983L.js";import{i as h,n as fe}from"./languages-DxkjqGGG.js";import{i as pe,r as me,t as he}from"./exampleFlashcard-D6F52orK.js";import{n as ge,r as _e,t as ve}from"./TagsField-BKjjRsh7.js";import{i as ye,n as g,r as _,t as v}from"./flashcardPresets-BObG6XdN.js";import{n as be,t as xe}from"./FlashcardPreview-b4k2bCZ_.js";import{n as y,r as Se,t as b}from"./useMediaQuery-cS9TrobN.js";var x,S;function C(){return(C=e((()=>{d(),x={name:`maximize-2`,size:24,node:[[`path`,{d:`M15 3h6v6`,key:`1q9fwt`}],[`path`,{d:`m21 3-7 7`,key:`1l2asr`}],[`path`,{d:`m3 21 7-7`,key:`tjx5ai`}],[`path`,{d:`M9 21H3v-6`,key:`wtvkvv`}]]},x.node,S=f(x)})))()}var w,T;function E(){return(E=e((()=>{d(),w={name:`minimize-2`,size:24,node:[[`path`,{d:`m14 10 7-7`,key:`oa77jy`}],[`path`,{d:`M20 10h-6V4`,key:`mjg0md`}],[`path`,{d:`m3 21 7-7`,key:`tjx5ai`}],[`path`,{d:`M4 14h6v6`,key:`rmj7iw`}]]},w.node,T=f(w)})))()}function Ce(e,t){switch(t.type){case`nameChanged`:return{...e,name:t.value};case`targetLanguageChanged`:return{...e,target_language:t.value};case`translationLanguageChanged`:return{...e,translation_language:t.value};case`presetChosen`:return{...e,flashcard_fields:v(t.preset)};case`fieldToggled`:return{...e,flashcard_fields:ee(e.flashcard_fields,t.key)};case`defaultTagsChanged`:return{...e,default_tags:[...t.tags]};case`mediaNameTagToggled`:return{...e,tags_media_name:!e.tags_media_name};case`ttsToggled`:return{...e,fills_audio_with_tts:!e.fills_audio_with_tts}}}function we(){return(we=e((()=>{te(),_()})))()}function D({fields:e,onPresetChosen:t,children:n}){let i=y(A),[a,o]=(0,O.useState)(!1),s=ye(e),c=!i||s===`custom`,l=!i&&a?`custom`:s;return(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(le,{label:`Flashcard preset`,options:c?[...g,j]:g,value:l,onChange:e=>{e===`custom`?o(!0):(o(!1),t(e))}}),(0,k.jsx)(`div`,{className:r(!a&&`hidden sm:block`),children:n})]})}var O,k,A,j;function M(){return(M=e((()=>{n(),O=t(),ce(),_(),b(),k=i(),A=`(min-width: 40rem)`,j={value:`custom`,label:`Custom`},D.__docgenInfo={description:`The flashcard presets, with the field checkboxes under them.
On a roomy screen the checkboxes are always shown and "Custom" appears only once the selection matches no preset.
On a narrow screen the checkboxes stay hidden until "Custom" is chosen, which then shows as the preset.`,methods:[],displayName:`PresetPicker`,props:{fields:{required:!0,tsType:{name:`unknown`},description:``},onPresetChosen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(preset: FlashcardPreset) => void`,signature:{arguments:[{type:{name:`union`,raw:`"beginner" | "intermediate" | "advanced"`,elements:[{name:`literal`,value:`"beginner"`},{name:`literal`,value:`"intermediate"`},{name:`literal`,value:`"advanced"`}]},name:`preset`}],return:{name:`void`}}},description:``},children:{required:!0,tsType:{name:`ReactNode`},description:`The field checkboxes.`}}}})))()}function N({values:e,dispatch:t}){let[n,i]=(0,P.useState)(`target`),a={target:e.target_language,translation:e.translation_language};return(0,F.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,F.jsx)(`div`,{role:`tablist`,"aria-label":`Field groups`,className:`flex border-b border-line sm:hidden`,children:m.map(e=>(0,F.jsx)(`button`,{type:`button`,role:`tab`,"aria-selected":e===n,onClick:()=>i(e),className:r(`-mb-px border-b-2 px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent`,e===n?`border-accent font-medium text-fg`:`border-transparent text-fg-muted hover:text-fg`),children:p(e,a)},e))}),(0,F.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-3`,children:m.map(i=>(0,F.jsxs)(`fieldset`,{className:r(`flex-col gap-2`,i===n?`flex`:`hidden sm:flex`),children:[(0,F.jsx)(`legend`,{className:`mb-2 hidden text-xs font-medium text-fg-muted sm:block`,children:p(i,a)}),ae.filter(e=>e.group===i).map(n=>(0,F.jsx)(c,{label:n.label(a),checked:e.flashcard_fields.includes(n.key),onChange:()=>t({type:`fieldToggled`,key:n.key})},n.key))]},i))})]})}var P,F;function I(){return(I=e((()=>{n(),P=t(),s(),ie(),F=i(),N.__docgenInfo={description:`The checkboxes for the fields a new flashcard starts with, grouped by language.
On a wide screen the groups stand side by side; on a narrow one, tabs show one group at a time.`,methods:[],displayName:`ProjectFormFields`,props:{values:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ name: string, 
/**
 * The language being learned, as a BCP 47 code.
 */
target_language: string, 
/**
 * The language translations and definitions are in, as a BCP 47 code.
 */
translation_language: string, 
/**
 * The fields a new flashcard starts with.
 */
flashcard_fields: Array<FlashcardFieldKey>, 
/**
 * Tags every new flashcard gets.
 */
default_tags: Array<string>, 
/**
 * Whether each new flashcard is also tagged with the name of the media file it was made from.
 */
tags_media_name: boolean, 
/**
 * Whether the audio fields are filled with text-to-speech when the media has no audio track.
 */
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},description:``},dispatch:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(action: ProjectFormAction) => void`,signature:{arguments:[{type:{name:`union`,raw:`| { type: "nameChanged"; value: string }
| { type: "targetLanguageChanged"; value: string }
| { type: "translationLanguageChanged"; value: string }
| { type: "presetChosen"; preset: FlashcardPreset }
| { type: "fieldToggled"; key: FlashcardFieldKey }
| { type: "defaultTagsChanged"; tags: readonly string[] }
| { type: "mediaNameTagToggled" }
| { type: "ttsToggled" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "nameChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"nameChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "targetLanguageChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"targetLanguageChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "translationLanguageChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"translationLanguageChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "presetChosen"; preset: FlashcardPreset }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"presetChosen"`,required:!0}},{key:`preset`,value:{name:`union`,raw:`"beginner" | "intermediate" | "advanced"`,elements:[{name:`literal`,value:`"beginner"`},{name:`literal`,value:`"intermediate"`},{name:`literal`,value:`"advanced"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "fieldToggled"; key: FlashcardFieldKey }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"fieldToggled"`,required:!0}},{key:`key`,value:{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "defaultTagsChanged"; tags: readonly string[] }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"defaultTagsChanged"`,required:!0}},{key:`tags`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "mediaNameTagToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"mediaNameTagToggled"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "ttsToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"ttsToggled"`,required:!0}}]}}]},name:`action`}],return:{name:`void`}}},description:``}}}})))()}function L({values:e}){let t=y(Se),[n,r]=(0,R.useState)(!1),i=e.tags_media_name?_e(e.default_tags,[B]):[...e.default_tags];return(0,z.jsxs)(`aside`,{className:`flex flex-col gap-2 md:col-start-2 md:row-span-4 md:row-start-1 md:sticky md:top-4 md:self-start`,children:[(0,z.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,z.jsx)(`h2`,{className:`text-sm font-medium text-fg-muted`,children:`Example flashcard`}),(0,z.jsxs)(o,{size:`sm`,variant:`subtle`,className:`md:hidden`,onClick:()=>r(!n),children:[n?(0,z.jsx)(T,{className:`size-3`,"aria-hidden":!0}):(0,z.jsx)(S,{className:`size-3`,"aria-hidden":!0}),n?`Shrink`:`Expand`]})]}),(0,z.jsx)(xe,{content:{...he,tags:i},includedFields:e.flashcard_fields,screenshotUrl:me,languages:{target:e.target_language,translation:e.translation_language},compact:!t&&!n})]})}var R,z,B;function V(){return(V=e((()=>{C(),E(),R=t(),a(),pe(),be(),b(),z=i(),B=`dark-s01e01`,L.__docgenInfo={description:`The example flashcard under the form's current settings.
On a narrow screen it is drawn small, so that it stays in view beside the checkboxes, until expanded.`,methods:[],displayName:`ProjectFormPreview`,props:{values:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ name: string, 
/**
 * The language being learned, as a BCP 47 code.
 */
target_language: string, 
/**
 * The language translations and definitions are in, as a BCP 47 code.
 */
translation_language: string, 
/**
 * The fields a new flashcard starts with.
 */
flashcard_fields: Array<FlashcardFieldKey>, 
/**
 * Tags every new flashcard gets.
 */
default_tags: Array<string>, 
/**
 * Whether each new flashcard is also tagged with the name of the media file it was made from.
 */
tags_media_name: boolean, 
/**
 * Whether the audio fields are filled with text-to-speech when the media has no audio track.
 */
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},description:``}}}})))()}function H({initialValues:e,submitLabel:t,onSubmit:n,onCancel:r}){let[i,a]=(0,W.useReducer)(Ce,e),s=(0,W.useId)(),l=i.target_language===i.translation_language;return(0,G.jsxs)(`form`,{className:`grid gap-6 md:grid-cols-[1fr_20rem] md:gap-x-8`,onSubmit:e=>{e.preventDefault(),l||n(i)},children:[(0,G.jsxs)(U,{children:[(0,G.jsx)(de,{label:`Project name`,value:i.name,placeholder:`German`,required:!0,onChange:e=>a({type:`nameChanged`,value:e.target.value})}),(0,G.jsxs)(`div`,{className:`grid gap-4 sm:grid-cols-2`,children:[(0,G.jsx)(u,{label:`Target language`,hint:`The language you are learning.`,options:h,value:i.target_language,onChange:e=>a({type:`targetLanguageChanged`,value:e.target.value})}),(0,G.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,G.jsx)(u,{label:`Translation language`,hint:`Translations and definitions in this language.`,options:h,value:i.translation_language,"aria-invalid":l||void 0,"aria-describedby":l?s:void 0,onChange:e=>a({type:`translationLanguageChanged`,value:e.target.value})}),l&&(0,G.jsx)(`p`,{id:s,className:`text-xs text-danger-fg`,children:`Choose a different language from the target language.`})]})]})]}),(0,G.jsxs)(U,{children:[(0,G.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,G.jsx)(`h2`,{className:`text-base font-semibold`,children:`Flashcards`}),(0,G.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`Which fields a new flashcard starts with. You can add a hidden field back on any single flashcard.`})]}),(0,G.jsx)(D,{fields:i.flashcard_fields,onPresetChosen:e=>a({type:`presetChosen`,preset:e}),children:(0,G.jsx)(N,{values:i,dispatch:a})})]}),(0,G.jsx)(L,{values:i}),(0,G.jsxs)(U,{children:[(0,G.jsx)(ve,{label:`Default tags`,tags:i.default_tags,onChange:e=>a({type:`defaultTagsChanged`,tags:e})}),(0,G.jsx)(c,{label:`Tag each flashcard with the name of its media file`,checked:i.tags_media_name,onChange:()=>a({type:`mediaNameTagToggled`})}),(0,G.jsx)(c,{label:`Fill the audio fields with text-to-speech when the media has no audio track`,hint:`Applies to ebooks and text files.`,checked:i.fills_audio_with_tts,onChange:()=>a({type:`ttsToggled`})})]}),(0,G.jsxs)(`div`,{className:`flex justify-end gap-2 md:col-start-1`,children:[(0,G.jsx)(o,{onClick:r,children:`Cancel`}),(0,G.jsx)(o,{variant:`primary`,type:`submit`,"aria-disabled":l||void 0,"aria-describedby":l?s:void 0,children:t})]})]})}function U({children:e}){return(0,G.jsx)(`div`,{className:`flex flex-col gap-4 md:col-start-1`,children:e})}var W,G;function K(){return(K=e((()=>{W=t(),a(),s(),l(),ge(),ue(),we(),fe(),M(),I(),V(),G=i(),H.__docgenInfo={description:`The settings of a new or existing project, with a preview of a flashcard made under them.
On a wide screen the preview stands beside the form; on a narrow one it sits under the preset, small until expanded.
While the translation language is the target language, a hint asks for another and the form cannot be submitted.`,methods:[],displayName:`ProjectForm`,props:{initialValues:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ name: string, 
/**
 * The language being learned, as a BCP 47 code.
 */
target_language: string, 
/**
 * The language translations and definitions are in, as a BCP 47 code.
 */
translation_language: string, 
/**
 * The fields a new flashcard starts with.
 */
flashcard_fields: Array<FlashcardFieldKey>, 
/**
 * Tags every new flashcard gets.
 */
default_tags: Array<string>, 
/**
 * Whether each new flashcard is also tagged with the name of the media file it was made from.
 */
tags_media_name: boolean, 
/**
 * Whether the audio fields are filled with text-to-speech when the media has no audio track.
 */
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},description:``},submitLabel:{required:!0,tsType:{name:`string`},description:``},onSubmit:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(values: ProjectSettings) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{ name: string, 
/**
 * The language being learned, as a BCP 47 code.
 */
target_language: string, 
/**
 * The language translations and definitions are in, as a BCP 47 code.
 */
translation_language: string, 
/**
 * The fields a new flashcard starts with.
 */
flashcard_fields: Array<FlashcardFieldKey>, 
/**
 * Tags every new flashcard gets.
 */
default_tags: Array<string>, 
/**
 * Whether each new flashcard is also tagged with the name of the media file it was made from.
 */
tags_media_name: boolean, 
/**
 * Whether the audio fields are filled with text-to-speech when the media has no audio track.
 */
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},name:`values`}],return:{name:`void`}}},description:``},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}function q({mode:e,initialValues:t,onSubmit:n,onCancel:r}){return(0,J.jsxs)(se,{wide:!0,onBack:r,backLabel:e===`create`?`Projects`:`Project`,children:[(0,J.jsx)(`h1`,{className:`text-xl font-semibold`,children:e===`create`?`New project`:`Project settings`}),(0,J.jsx)(H,{initialValues:t,submitLabel:e===`create`?`Create project`:`Save settings`,onSubmit:n,onCancel:r})]})}var J;function Y(){return(Y=e((()=>{oe(),K(),J=i(),q.__docgenInfo={description:`The screen for creating a project or editing an existing project's settings. Back leads to the projects or to the project.`,methods:[],displayName:`ProjectSettingsView`,props:{mode:{required:!0,tsType:{name:`union`,raw:`"create" | "edit"`,elements:[{name:`literal`,value:`"create"`},{name:`literal`,value:`"edit"`}]},description:``},initialValues:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ name: string, 
/**
 * The language being learned, as a BCP 47 code.
 */
target_language: string, 
/**
 * The language translations and definitions are in, as a BCP 47 code.
 */
translation_language: string, 
/**
 * The fields a new flashcard starts with.
 */
flashcard_fields: Array<FlashcardFieldKey>, 
/**
 * Tags every new flashcard gets.
 */
default_tags: Array<string>, 
/**
 * Whether each new flashcard is also tagged with the name of the media file it was made from.
 */
tags_media_name: boolean, 
/**
 * Whether the audio fields are filled with text-to-speech when the media has no audio track.
 */
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},description:``},onSubmit:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(values: ProjectSettings) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{ name: string, 
/**
 * The language being learned, as a BCP 47 code.
 */
target_language: string, 
/**
 * The language translations and definitions are in, as a BCP 47 code.
 */
translation_language: string, 
/**
 * The fields a new flashcard starts with.
 */
flashcard_fields: Array<FlashcardFieldKey>, 
/**
 * Tags every new flashcard gets.
 */
default_tags: Array<string>, 
/**
 * Whether each new flashcard is also tagged with the name of the media file it was made from.
 */
tags_media_name: boolean, 
/**
 * Whether the audio fields are filled with text-to-speech when the media has no audio track.
 */
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},name:`values`}],return:{name:`void`}}},description:``},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}var X,Z,Q,Te,Ee,De;function $(){return($=e((()=>{_(),re(),Y(),{fn:X}=__STORYBOOK_MODULE_TEST__,Z={title:`Projects/ProjectSettingsView`,component:q,decorators:[ne],parameters:{layout:`fullscreen`},args:{mode:`create`,initialValues:{name:``,target_language:`de`,translation_language:`en`,flashcard_fields:v(`beginner`),default_tags:[],tags_media_name:!0,fills_audio_with_tts:!1},onSubmit:X(),onCancel:X()}},Q={},Te={args:{initialValues:{name:``,target_language:`ja`,translation_language:`en`,flashcard_fields:v(`intermediate`),default_tags:[`tv`],tags_media_name:!0,fills_audio_with_tts:!0}}},Ee={args:{mode:`edit`,initialValues:{name:`German`,target_language:`de`,translation_language:`en`,flashcard_fields:v(`advanced`),default_tags:[`tv`],tags_media_name:!1,fills_audio_with_tts:!1}}},De=[`NewProject`,`NewProjectPrefilledFromLast`,`EditingSettings`]})))()}$();export{Ee as EditingSettings,Q as NewProject,Te as NewProjectPrefilledFromLast,De as __namedExportsOrder,Z as default};