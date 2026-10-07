import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-LZ3hL8WN.js";import{n,t as r}from"./clsx-CTwy9ux-.js";import{t as i}from"./jsx-runtime-DeHZSEgm.js";import{n as a,t as o}from"./Button-KG4HKgfk.js";import{n as s,t as c}from"./CheckboxField-BHuU77av.js";import{n as l,t as u}from"./SelectField-DMAE55ME.js";import{n as ee,t as te}from"./withAppStore-4m7FhvZO.js";import{i as ne,n as re,r as ie,t as ae}from"./minimize-2-Dr_BPvye.js";import{n as oe,r as d,t as se}from"./TagsField-Bvg-tH2I.js";import{i as f,n as ce}from"./languages-DxkjqGGG.js";import{a as p,i as m,n as le,o as ue,r as h}from"./flashcardFields-BSdpcbyc.js";import{n as de,t as fe}from"./ScreenLayout-B21fd5fs.js";import{n as pe,t as me}from"./SegmentedControl-BSbPemr-.js";import{n as he,t as ge}from"./TextField-DZTfZ8z_.js";import{i as _e,r as g,t as ve}from"./exampleFlashcard-D6F52orK.js";import{i as ye,n as _,r as v,t as y}from"./flashcardPresets-BObG6XdN.js";import{n as be,t as xe}from"./FlashcardPreview-DkISr7HX.js";import{n as b,r as Se,t as x}from"./useMediaQuery-BHBM3SEp.js";function S(e,t){switch(t.type){case`nameChanged`:return{...e,name:t.value};case`targetLanguageChanged`:return{...e,target_language:t.value};case`translationLanguageChanged`:return{...e,translation_language:t.value};case`presetChosen`:return{...e,flashcard_fields:y(t.preset)};case`fieldToggled`:return{...e,flashcard_fields:ue(e.flashcard_fields,t.key)};case`defaultTagsChanged`:return{...e,default_tags:[...t.tags]};case`mediaNameTagToggled`:return{...e,tags_media_name:!e.tags_media_name};case`ttsToggled`:return{...e,fills_audio_with_tts:!e.fills_audio_with_tts}}}function C(){return(C=e((()=>{m(),v()})))()}function w({fields:e,onPresetChosen:t,children:n}){let i=b(D),[a,o]=(0,T.useState)(!1),s=ye(e),c=!i||s===`custom`,l=!i&&a?`custom`:s;return(0,E.jsxs)(E.Fragment,{children:[(0,E.jsx)(me,{label:`Flashcard preset`,options:c?[..._,O]:_,value:l,onChange:e=>{e===`custom`?o(!0):(o(!1),t(e))}}),(0,E.jsx)(`div`,{className:r(!a&&`hidden sm:block`),children:n})]})}var T,E,D,O;function k(){return(k=e((()=>{n(),T=t(),pe(),v(),x(),E=i(),D=`(min-width: 40rem)`,O={value:`custom`,label:`Custom`},w.__docgenInfo={description:`The flashcard presets, with the field checkboxes under them.
On a roomy screen the checkboxes are always shown and "Custom" appears only once the selection matches no preset.
On a narrow screen the checkboxes stay hidden until "Custom" is chosen, which then shows as the preset.`,methods:[],displayName:`PresetPicker`,props:{fields:{required:!0,tsType:{name:`unknown`},description:``},onPresetChosen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(preset: FlashcardPreset) => void`,signature:{arguments:[{type:{name:`union`,raw:`"beginner" | "intermediate" | "advanced"`,elements:[{name:`literal`,value:`"beginner"`},{name:`literal`,value:`"intermediate"`},{name:`literal`,value:`"advanced"`}]},name:`preset`}],return:{name:`void`}}},description:``},children:{required:!0,tsType:{name:`ReactNode`},description:`The field checkboxes.`}}}})))()}function A({values:e,dispatch:t}){let[n,i]=(0,j.useState)(`target`),a={target:e.target_language,translation:e.translation_language};return(0,M.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,M.jsx)(`div`,{role:`tablist`,"aria-label":`Field groups`,className:`flex border-b border-line sm:hidden`,children:h.map(e=>(0,M.jsx)(`button`,{type:`button`,role:`tab`,"aria-selected":e===n,onClick:()=>i(e),className:r(`-mb-px border-b-2 px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent`,e===n?`border-accent font-medium text-fg`:`border-transparent text-fg-muted hover:text-fg`),children:p(e,a)},e))}),(0,M.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-3`,children:h.map(i=>(0,M.jsxs)(`fieldset`,{className:r(`flex-col gap-2`,i===n?`flex`:`hidden sm:flex`),children:[(0,M.jsx)(`legend`,{className:`mb-2 hidden text-xs font-medium text-fg-muted sm:block`,children:p(i,a)}),le.filter(e=>e.group===i).map(n=>(0,M.jsx)(c,{label:n.label(a),checked:e.flashcard_fields.includes(n.key),onChange:()=>t({type:`fieldToggled`,key:n.key})},n.key))]},i))})]})}var j,M;function N(){return(N=e((()=>{n(),j=t(),s(),m(),M=i(),A.__docgenInfo={description:`The checkboxes for the fields a new flashcard starts with, grouped by language.
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
| { type: "ttsToggled" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "nameChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"nameChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "targetLanguageChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"targetLanguageChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "translationLanguageChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"translationLanguageChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "presetChosen"; preset: FlashcardPreset }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"presetChosen"`,required:!0}},{key:`preset`,value:{name:`union`,raw:`"beginner" | "intermediate" | "advanced"`,elements:[{name:`literal`,value:`"beginner"`},{name:`literal`,value:`"intermediate"`},{name:`literal`,value:`"advanced"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "fieldToggled"; key: FlashcardFieldKey }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"fieldToggled"`,required:!0}},{key:`key`,value:{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "defaultTagsChanged"; tags: readonly string[] }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"defaultTagsChanged"`,required:!0}},{key:`tags`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "mediaNameTagToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"mediaNameTagToggled"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "ttsToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"ttsToggled"`,required:!0}}]}}]},name:`action`}],return:{name:`void`}}},description:``}}}})))()}function P({values:e}){let t=b(Se),[n,r]=(0,F.useState)(!1),i=e.tags_media_name?d(e.default_tags,[L]):[...e.default_tags];return(0,I.jsxs)(`aside`,{className:`flex flex-col gap-2 md:col-start-2 md:row-span-4 md:row-start-1 md:sticky md:top-4 md:self-start`,children:[(0,I.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,I.jsx)(`h2`,{className:`text-sm font-medium text-fg-muted`,children:`Example flashcard`}),(0,I.jsxs)(o,{size:`sm`,variant:`subtle`,className:`md:hidden`,onClick:()=>r(!n),children:[n?(0,I.jsx)(ae,{className:`size-3`,"aria-hidden":!0}):(0,I.jsx)(ie,{className:`size-3`,"aria-hidden":!0}),n?`Shrink`:`Expand`]})]}),(0,I.jsx)(xe,{content:{...ve,tags:i},includedFields:e.flashcard_fields,screenshotUrl:g,languages:{target:e.target_language,translation:e.translation_language},compact:!t&&!n})]})}var F,I,L;function R(){return(R=e((()=>{ne(),re(),F=t(),a(),_e(),be(),x(),I=i(),L=`dark-s01e01`,P.__docgenInfo={description:`The example flashcard under the form's current settings.
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
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},description:``}}}})))()}function z({initialValues:e,submitLabel:t,onSubmit:n,onCancel:r}){let[i,a]=(0,V.useReducer)(S,e),s=(0,V.useId)(),l=i.target_language===i.translation_language;return(0,H.jsxs)(`form`,{className:`grid gap-6 md:grid-cols-[1fr_20rem] md:gap-x-8`,onSubmit:e=>{e.preventDefault(),l||n(i)},children:[(0,H.jsxs)(B,{children:[(0,H.jsx)(ge,{label:`Project name`,value:i.name,placeholder:`German`,required:!0,onChange:e=>a({type:`nameChanged`,value:e.target.value})}),(0,H.jsxs)(`div`,{className:`grid gap-4 sm:grid-cols-2`,children:[(0,H.jsx)(u,{label:`Target language`,hint:`The language you are learning.`,options:f,value:i.target_language,onChange:e=>a({type:`targetLanguageChanged`,value:e.target.value})}),(0,H.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,H.jsx)(u,{label:`Translation language`,hint:`Translations and definitions in this language.`,options:f,value:i.translation_language,"aria-invalid":l||void 0,"aria-describedby":l?s:void 0,onChange:e=>a({type:`translationLanguageChanged`,value:e.target.value})}),l&&(0,H.jsx)(`p`,{id:s,className:`text-xs text-danger-fg`,children:`Choose a different language from the target language.`})]})]})]}),(0,H.jsxs)(B,{children:[(0,H.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,H.jsx)(`h2`,{className:`text-base font-semibold`,children:`Flashcards`}),(0,H.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`Which fields a new flashcard starts with. You can add a hidden field back on any single flashcard.`})]}),(0,H.jsx)(w,{fields:i.flashcard_fields,onPresetChosen:e=>a({type:`presetChosen`,preset:e}),children:(0,H.jsx)(A,{values:i,dispatch:a})})]}),(0,H.jsx)(P,{values:i}),(0,H.jsxs)(B,{children:[(0,H.jsx)(se,{label:`Default tags`,tags:i.default_tags,onChange:e=>a({type:`defaultTagsChanged`,tags:e})}),(0,H.jsx)(c,{label:`Tag each flashcard with the name of its media file`,checked:i.tags_media_name,onChange:()=>a({type:`mediaNameTagToggled`})}),(0,H.jsx)(c,{label:`Fill the audio fields with text-to-speech when the media has no audio track`,hint:`Applies to ebooks and text files.`,checked:i.fills_audio_with_tts,onChange:()=>a({type:`ttsToggled`})})]}),(0,H.jsxs)(`div`,{className:`flex justify-end gap-2 md:col-start-1`,children:[(0,H.jsx)(o,{onClick:r,children:`Cancel`}),(0,H.jsx)(o,{variant:`primary`,type:`submit`,"aria-disabled":l||void 0,"aria-describedby":l?s:void 0,children:t})]})]})}function B({children:e}){return(0,H.jsx)(`div`,{className:`flex flex-col gap-4 md:col-start-1`,children:e})}var V,H;function U(){return(U=e((()=>{V=t(),a(),s(),l(),oe(),he(),C(),ce(),k(),N(),R(),H=i(),z.__docgenInfo={description:`The settings of a new or existing project, with a preview of a flashcard made under them.
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
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},name:`values`}],return:{name:`void`}}},description:``},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}function W({mode:e,initialValues:t,onSubmit:n,onCancel:r}){return(0,G.jsxs)(fe,{wide:!0,onBack:r,backLabel:e===`create`?`Projects`:`Project`,children:[(0,G.jsx)(`h1`,{className:`text-xl font-semibold`,children:e===`create`?`New project`:`Project settings`}),(0,G.jsx)(z,{initialValues:t,submitLabel:e===`create`?`Create project`:`Save settings`,onSubmit:n,onCancel:r})]})}var G;function K(){return(K=e((()=>{de(),U(),G=i(),W.__docgenInfo={description:`The screen for creating a project or editing an existing project's settings. Back leads to the projects or to the project.`,methods:[],displayName:`ProjectSettingsView`,props:{mode:{required:!0,tsType:{name:`union`,raw:`"create" | "edit"`,elements:[{name:`literal`,value:`"create"`},{name:`literal`,value:`"edit"`}]},description:``},initialValues:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ name: string, 
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
fills_audio_with_tts: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`}]}},name:`values`}],return:{name:`void`}}},description:``},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}var q,J,Y,X,Z,Q;function $(){return($=e((()=>{v(),te(),K(),{fn:q}=__STORYBOOK_MODULE_TEST__,J={title:`Projects/ProjectSettingsView`,component:W,decorators:[ee],parameters:{layout:`fullscreen`},args:{mode:`create`,initialValues:{name:``,target_language:`de`,translation_language:`en`,flashcard_fields:y(`beginner`),default_tags:[],tags_media_name:!0,fills_audio_with_tts:!1},onSubmit:q(),onCancel:q()}},Y={},X={args:{initialValues:{name:``,target_language:`ja`,translation_language:`en`,flashcard_fields:y(`intermediate`),default_tags:[`tv`],tags_media_name:!0,fills_audio_with_tts:!0}}},Z={args:{mode:`edit`,initialValues:{name:`German`,target_language:`de`,translation_language:`en`,flashcard_fields:y(`advanced`),default_tags:[`tv`],tags_media_name:!1,fills_audio_with_tts:!1}}},Q=[`NewProject`,`NewProjectPrefilledFromLast`,`EditingSettings`]})))()}$();export{Z as EditingSettings,Y as NewProject,X as NewProjectPrefilledFromLast,Q as __namedExportsOrder,J as default};