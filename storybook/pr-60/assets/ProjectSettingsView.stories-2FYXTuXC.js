import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-C2DFymnf.js";import{n,t as r}from"./clsx-CTwy9ux-.js";import{t as i}from"./jsx-runtime-DeHZSEgm.js";import{n as a,t as o}from"./Button-B-ZkWXW4.js";import{n as s,t as c}from"./CheckboxField-CEoaTgdO.js";import{n as l,t as u}from"./createLucideIcon-BRbN01oS.js";import{n as ee,t as te}from"./SegmentedControl-CAonWEP_.js";import{n as ne,t as d}from"./SelectField-n-NmLeBR.js";import{n as re,t as ie}from"./TextField-DjpV8Bt2.js";import{Jn as f,rt as ae,t as p}from"./src-C4TjXEWu.js";import{n as oe,t as se}from"./withAppStore-DuR1SwdY.js";import{i as m,n as ce}from"./languages-DxkjqGGG.js";import{a as le,i as h,n as g,r as _,t as v}from"./flashcardPresets-D7gCIyj5.js";import{i as ue,r as de,t as fe}from"./exampleFlashcard-D6F52orK.js";import{n as pe,t as me}from"./TagsField-d-94nx9v.js";import{a as y,i as he,n as ge,r as b}from"./flashcardFields-B3UVt5rv.js";import{n as _e,t as ve}from"./FlashcardPreview-BevXmm9c.js";import{n as ye,t as be}from"./ScreenLayout-D2pa0xb1.js";import{n as xe,t as Se}from"./CardSideToggle-Bjf1QriJ.js";import{n as x,r as Ce,t as S}from"./useMediaQuery-DTrL7y-r.js";var C,w;function T(){return(T=e((()=>{l(),C={name:`maximize-2`,size:24,node:[[`path`,{d:`M15 3h6v6`,key:`1q9fwt`}],[`path`,{d:`m21 3-7 7`,key:`1l2asr`}],[`path`,{d:`m3 21 7-7`,key:`tjx5ai`}],[`path`,{d:`M9 21H3v-6`,key:`wtvkvv`}]]},C.node,w=u(C)})))()}var E,D;function O(){return(O=e((()=>{l(),E={name:`minimize-2`,size:24,node:[[`path`,{d:`m14 10 7-7`,key:`oa77jy`}],[`path`,{d:`M20 10h-6V4`,key:`mjg0md`}],[`path`,{d:`m3 21 7-7`,key:`tjx5ai`}],[`path`,{d:`M4 14h6v6`,key:`rmj7iw`}]]},E.node,D=u(E)})))()}function we(e,t){switch(t.type){case`nameChanged`:return{...e,name:t.value};case`targetLanguageChanged`:return{...e,target_language:t.value};case`translationLanguageChanged`:return{...e,translation_language:t.value};case`presetChosen`:return{...e,flashcard_fields:v(t.preset),flashcard_front_fields:_(t.preset)};case`fieldToggled`:return{...e,flashcard_fields:f(e.flashcard_fields,t.key)};case`frontFieldToggled`:return{...e,flashcard_front_fields:f(e.flashcard_front_fields,t.key)};case`defaultTagsChanged`:return{...e,default_tags:[...t.tags]};case`mediaNameTagToggled`:return{...e,tags_media_name:!e.tags_media_name};case`ttsToggled`:return{...e,fills_audio_with_tts:!e.fills_audio_with_tts};case`deletionListingToggled`:return{...e,lists_anki_deletions:!e.lists_anki_deletions}}}function Te(){return(Te=e((()=>{p(),h()})))()}function k({fields:e,frontFields:t,onPresetChosen:n,children:i}){let a=x(M),[o,s]=(0,A.useState)(!1),c=le(e,t),l=!a||c===`custom`,u=!a&&o?`custom`:c;return(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(te,{label:`Flashcard preset`,options:l?[...g,N]:g,value:u,onChange:e=>{e===`custom`?s(!0):(s(!1),n(e))}}),(0,j.jsx)(`div`,{className:r(!o&&`hidden sm:block`),children:i})]})}var A,j,M,N;function P(){return(P=e((()=>{n(),A=t(),ee(),S(),h(),j=i(),M=`(min-width: 40rem)`,N={value:`custom`,label:`Custom`},k.__docgenInfo={description:`The flashcard presets, with the field checkboxes under them. A preset sets both the fields and which of them are on the front.
On a roomy screen the checkboxes are always shown and "Custom" appears only once the selection matches no preset.
On a narrow screen the checkboxes stay hidden until "Custom" is chosen, which then shows as the preset.`,methods:[],displayName:`PresetPicker`,props:{fields:{required:!0,tsType:{name:`unknown`},description:``},frontFields:{required:!0,tsType:{name:`unknown`},description:``},onPresetChosen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(preset: FlashcardPreset) => void`,signature:{arguments:[{type:{name:`union`,raw:`"beginner" | "intermediate" | "advanced"`,elements:[{name:`literal`,value:`"beginner"`},{name:`literal`,value:`"intermediate"`},{name:`literal`,value:`"advanced"`}]},name:`preset`}],return:{name:`void`}}},description:``},children:{required:!0,tsType:{name:`ReactNode`},description:`The field checkboxes and the controls that put fields on the front or the back.`}}}})))()}function F({values:e,dispatch:t}){let[n,i]=(0,I.useState)(`target`),a={target:e.target_language,translation:e.translation_language};return(0,L.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,L.jsx)(`div`,{role:`tablist`,"aria-label":`Field groups`,className:`flex border-b border-line sm:hidden`,children:b.map(e=>(0,L.jsx)(`button`,{type:`button`,role:`tab`,"aria-selected":e===n,onClick:()=>i(e),className:r(`-mb-px border-b-2 px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent`,e===n?`border-accent font-medium text-fg`:`border-transparent text-fg-muted hover:text-fg`),children:y(e,a)},e))}),(0,L.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-3`,children:b.map(i=>(0,L.jsxs)(`fieldset`,{className:r(`flex-col gap-2`,i===n?`flex`:`hidden sm:flex`),children:[(0,L.jsx)(`legend`,{className:`mb-2 hidden text-xs font-medium text-fg-muted sm:block`,children:y(i,a)}),ge.filter(e=>e.group===i).map(n=>{let r=n.label(a),i=e.flashcard_fields.includes(n.key);return(0,L.jsxs)(`div`,{className:`flex items-start justify-between gap-2`,children:[(0,L.jsx)(c,{label:r,checked:i,onChange:()=>t({type:`fieldToggled`,key:n.key})}),i&&n.key!==`tags`&&(0,L.jsx)(Se,{fieldLabel:r,isFront:e.flashcard_front_fields.includes(n.key),onToggle:()=>t({type:`frontFieldToggled`,key:n.key})})]},n.key)})]},i))})]})}var I,L;function R(){return(R=e((()=>{n(),I=t(),s(),he(),xe(),L=i(),F.__docgenInfo={description:`The checkboxes for the fields a new flashcard starts with, grouped by language.
Beside each included field except the tags, a toggle says whether it is on the front or the back of the card.
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
fills_audio_with_tts: boolean, 
/**
 * The included fields shown on the front of a card. The other included fields go on the back.
 */
flashcard_front_fields: Array<FlashcardFieldKey>, 
/**
 * Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
 * While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.
 */
lists_anki_deletions: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`},{key:`flashcard_front_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The included fields shown on the front of a card. The other included fields go on the back.`},{key:`lists_anki_deletions`,value:{name:`boolean`,required:!0},description:`Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},description:``},dispatch:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(action: ProjectFormAction) => void`,signature:{arguments:[{type:{name:`union`,raw:`| { type: "nameChanged"; value: string }
| { type: "targetLanguageChanged"; value: string }
| { type: "translationLanguageChanged"; value: string }
| { type: "presetChosen"; preset: FlashcardPreset }
| { type: "fieldToggled"; key: FlashcardFieldKey }
| { type: "frontFieldToggled"; key: FlashcardFieldKey }
| { type: "defaultTagsChanged"; tags: readonly string[] }
| { type: "mediaNameTagToggled" }
| { type: "ttsToggled" }
| { type: "deletionListingToggled" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "nameChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"nameChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "targetLanguageChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"targetLanguageChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "translationLanguageChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"translationLanguageChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "presetChosen"; preset: FlashcardPreset }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"presetChosen"`,required:!0}},{key:`preset`,value:{name:`union`,raw:`"beginner" | "intermediate" | "advanced"`,elements:[{name:`literal`,value:`"beginner"`},{name:`literal`,value:`"intermediate"`},{name:`literal`,value:`"advanced"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "fieldToggled"; key: FlashcardFieldKey }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"fieldToggled"`,required:!0}},{key:`key`,value:{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "frontFieldToggled"; key: FlashcardFieldKey }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"frontFieldToggled"`,required:!0}},{key:`key`,value:{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "defaultTagsChanged"; tags: readonly string[] }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"defaultTagsChanged"`,required:!0}},{key:`tags`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "mediaNameTagToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"mediaNameTagToggled"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "ttsToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"ttsToggled"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "deletionListingToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"deletionListingToggled"`,required:!0}}]}}]},name:`action`}],return:{name:`void`}}},description:``}}}})))()}function z({values:e}){let t=x(Ce),[n,r]=(0,B.useState)(!1),i=e.tags_media_name?ae(e.default_tags,[H]):[...e.default_tags];return(0,V.jsxs)(`aside`,{className:`flex flex-col gap-2 md:col-start-2 md:row-span-4 md:row-start-1 md:sticky md:top-4 md:self-start`,children:[(0,V.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,V.jsx)(`h2`,{className:`text-sm font-medium text-fg-muted`,children:`Example flashcard`}),(0,V.jsxs)(o,{size:`sm`,variant:`subtle`,className:`md:hidden`,onClick:()=>r(!n),children:[n?(0,V.jsx)(D,{className:`size-3`,"aria-hidden":!0}):(0,V.jsx)(w,{className:`size-3`,"aria-hidden":!0}),n?`Shrink`:`Expand`]})]}),(0,V.jsx)(ve,{content:{...fe,tags:i},includedFields:e.flashcard_fields,frontFields:e.flashcard_front_fields,screenshotUrl:de,languages:{target:e.target_language,translation:e.translation_language},compact:!t&&!n})]})}var B,V,H;function U(){return(U=e((()=>{p(),T(),O(),B=t(),a(),ue(),_e(),S(),V=i(),H=`dark-s01e01`,z.__docgenInfo={description:`The example flashcard under the form's current settings.
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
fills_audio_with_tts: boolean, 
/**
 * The included fields shown on the front of a card. The other included fields go on the back.
 */
flashcard_front_fields: Array<FlashcardFieldKey>, 
/**
 * Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
 * While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.
 */
lists_anki_deletions: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`},{key:`flashcard_front_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The included fields shown on the front of a card. The other included fields go on the back.`},{key:`lists_anki_deletions`,value:{name:`boolean`,required:!0},description:`Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},description:``}}}})))()}function W({initialValues:e,submitLabel:t,onSubmit:n,onCancel:r}){let[i,a]=(0,K.useReducer)(we,e),s=(0,K.useId)(),l=i.target_language===i.translation_language;return(0,q.jsxs)(`form`,{className:`grid gap-6 md:grid-cols-[1fr_20rem] md:gap-x-8`,onSubmit:e=>{e.preventDefault(),l||n(i)},children:[(0,q.jsxs)(G,{children:[(0,q.jsx)(ie,{label:`Project name`,value:i.name,placeholder:`German`,required:!0,onChange:e=>a({type:`nameChanged`,value:e.target.value})}),(0,q.jsxs)(`div`,{className:`grid gap-4 sm:grid-cols-2`,children:[(0,q.jsx)(d,{label:`Target language`,hint:`The language you are learning.`,options:m,value:i.target_language,onChange:e=>a({type:`targetLanguageChanged`,value:e.target.value})}),(0,q.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,q.jsx)(d,{label:`Translation language`,hint:`Translations and definitions in this language.`,options:m,value:i.translation_language,"aria-invalid":l||void 0,"aria-describedby":l?s:void 0,onChange:e=>a({type:`translationLanguageChanged`,value:e.target.value})}),l&&(0,q.jsx)(`p`,{id:s,className:`text-xs text-danger-fg`,children:`Choose a different language from the target language.`})]})]})]}),(0,q.jsxs)(G,{children:[(0,q.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,q.jsx)(`h2`,{className:`text-base font-semibold`,children:`Flashcards`}),(0,q.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`Which fields a new flashcard starts with. You can add a hidden field back on any single flashcard.`})]}),(0,q.jsx)(k,{fields:i.flashcard_fields,frontFields:i.flashcard_front_fields,onPresetChosen:e=>a({type:`presetChosen`,preset:e}),children:(0,q.jsx)(F,{values:i,dispatch:a})})]}),(0,q.jsx)(z,{values:i}),(0,q.jsxs)(G,{children:[(0,q.jsx)(me,{label:`Default tags`,tags:i.default_tags,onChange:e=>a({type:`defaultTagsChanged`,tags:e})}),(0,q.jsx)(c,{label:`Tag each flashcard with the name of its media file`,checked:i.tags_media_name,onChange:()=>a({type:`mediaNameTagToggled`})}),(0,q.jsx)(c,{label:`Fill the audio fields with text-to-speech when the media has no audio track`,hint:`Applies to ebooks and text files.`,checked:i.fills_audio_with_tts,onChange:()=>a({type:`ttsToggled`})}),(0,q.jsx)(c,{label:`List deleted flashcards that are still in Anki`,hint:`When you delete a flashcard that an export flushed from the Anki updates queue, or that AnkiConnect sent to Anki, the project screen lists it so that you can delete it there too. Turning this off stops new ones from being listed; those already listed stay until you mark them done. While AnkiConnect is on, it deletes them from Anki itself.`,checked:i.lists_anki_deletions,onChange:()=>a({type:`deletionListingToggled`})})]}),(0,q.jsxs)(`div`,{className:`flex justify-end gap-2 md:col-start-1`,children:[(0,q.jsx)(o,{onClick:r,children:`Cancel`}),(0,q.jsx)(o,{variant:`primary`,type:`submit`,"aria-disabled":l||void 0,"aria-describedby":l?s:void 0,children:t})]})]})}function G({children:e}){return(0,q.jsx)(`div`,{className:`flex flex-col gap-4 md:col-start-1`,children:e})}var K,q;function J(){return(J=e((()=>{K=t(),a(),s(),ne(),pe(),re(),ce(),Te(),P(),R(),U(),q=i(),W.__docgenInfo={description:`The settings of a new or existing project, with a preview of a flashcard made under them.
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
fills_audio_with_tts: boolean, 
/**
 * The included fields shown on the front of a card. The other included fields go on the back.
 */
flashcard_front_fields: Array<FlashcardFieldKey>, 
/**
 * Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
 * While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.
 */
lists_anki_deletions: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`},{key:`flashcard_front_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The included fields shown on the front of a card. The other included fields go on the back.`},{key:`lists_anki_deletions`,value:{name:`boolean`,required:!0},description:`Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},description:``},submitLabel:{required:!0,tsType:{name:`string`},description:``},onSubmit:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(values: ProjectSettings) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{ name: string, 
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
fills_audio_with_tts: boolean, 
/**
 * The included fields shown on the front of a card. The other included fields go on the back.
 */
flashcard_front_fields: Array<FlashcardFieldKey>, 
/**
 * Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
 * While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.
 */
lists_anki_deletions: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`},{key:`flashcard_front_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The included fields shown on the front of a card. The other included fields go on the back.`},{key:`lists_anki_deletions`,value:{name:`boolean`,required:!0},description:`Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},name:`values`}],return:{name:`void`}}},description:``},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}function Y({mode:e,initialValues:t,onSubmit:n,onCancel:r}){return(0,X.jsxs)(be,{wide:!0,onBack:r,backLabel:e===`create`?`Projects`:`Project`,children:[(0,X.jsx)(`h1`,{className:`text-xl font-semibold`,children:e===`create`?`New project`:`Project settings`}),(0,X.jsx)(W,{initialValues:t,submitLabel:e===`create`?`Create project`:`Save settings`,onSubmit:n,onCancel:r})]})}var X;function Ee(){return(Ee=e((()=>{ye(),J(),X=i(),Y.__docgenInfo={description:`The screen for creating a project or editing an existing project's settings. Back leads to the projects or to the project.`,methods:[],displayName:`ProjectSettingsView`,props:{mode:{required:!0,tsType:{name:`union`,raw:`"create" | "edit"`,elements:[{name:`literal`,value:`"create"`},{name:`literal`,value:`"edit"`}]},description:``},initialValues:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ name: string, 
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
fills_audio_with_tts: boolean, 
/**
 * The included fields shown on the front of a card. The other included fields go on the back.
 */
flashcard_front_fields: Array<FlashcardFieldKey>, 
/**
 * Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
 * While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.
 */
lists_anki_deletions: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`},{key:`flashcard_front_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The included fields shown on the front of a card. The other included fields go on the back.`},{key:`lists_anki_deletions`,value:{name:`boolean`,required:!0},description:`Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},description:``},onSubmit:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(values: ProjectSettings) => void`,signature:{arguments:[{type:{name:`signature`,type:`object`,raw:`{ name: string, 
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
fills_audio_with_tts: boolean, 
/**
 * The included fields shown on the front of a card. The other included fields go on the back.
 */
flashcard_front_fields: Array<FlashcardFieldKey>, 
/**
 * Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
 * While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.
 */
lists_anki_deletions: boolean, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`target_language`,value:{name:`string`,required:!0},description:`The language being learned, as a BCP 47 code.`},{key:`translation_language`,value:{name:`string`,required:!0},description:`The language translations and definitions are in, as a BCP 47 code.`},{key:`flashcard_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The fields a new flashcard starts with.`},{key:`default_tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Tags every new flashcard gets.`},{key:`tags_media_name`,value:{name:`boolean`,required:!0},description:`Whether each new flashcard is also tagged with the name of the media file it was made from.`},{key:`fills_audio_with_tts`,value:{name:`boolean`,required:!0},description:`Whether the audio fields are filled with text-to-speech when the media has no audio track.`},{key:`flashcard_front_fields`,value:{name:`Array`,elements:[{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}]}],raw:`Array<FlashcardFieldKey>`,required:!0},description:`The included fields shown on the front of a card. The other included fields go on the back.`},{key:`lists_anki_deletions`,value:{name:`boolean`,required:!0},description:`Whether a deleted flashcard that reached Anki is listed on the project screen, so that the user can delete its note there.
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},name:`values`}],return:{name:`void`}}},description:``},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}var Z,De,Oe,ke,Q,Ae,je,Me;function $(){return($=e((()=>{se(),h(),Ee(),{fn:Z}=__STORYBOOK_MODULE_TEST__,De={title:`Screens/Project Settings/ProjectSettingsView`,component:Y,decorators:[oe],parameters:{layout:`fullscreen`},args:{mode:`create`,initialValues:{name:``,target_language:`de`,translation_language:`en`,flashcard_fields:v(`beginner`),flashcard_front_fields:_(`beginner`),lists_anki_deletions:!0,default_tags:[],tags_media_name:!0,fills_audio_with_tts:!1},onSubmit:Z(),onCancel:Z()}},Oe={},ke={args:{initialValues:{name:``,target_language:`ja`,translation_language:`en`,flashcard_fields:v(`intermediate`),flashcard_front_fields:_(`intermediate`),lists_anki_deletions:!0,default_tags:[`tv`],tags_media_name:!0,fills_audio_with_tts:!0}}},Q={name:`German`,target_language:`de`,translation_language:`en`,flashcard_fields:v(`advanced`),flashcard_front_fields:_(`advanced`),lists_anki_deletions:!0,default_tags:[`tv`],tags_media_name:!1,fills_audio_with_tts:!1},Ae={args:{mode:`edit`,initialValues:Q}},je={args:{mode:`edit`,initialValues:{...Q,lists_anki_deletions:!1}}},Me=[`NewProject`,`NewProjectPrefilledFromLast`,`EditingSettings`,`EditingSettingsWithoutTheDeletionList`]})))()}$();export{Ae as EditingSettings,je as EditingSettingsWithoutTheDeletionList,Oe as NewProject,ke as NewProjectPrefilledFromLast,Me as __namedExportsOrder,De as default};