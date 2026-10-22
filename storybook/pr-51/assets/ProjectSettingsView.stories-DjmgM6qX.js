import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t}from"./iframe-zqu57hcG.js";import{it as n,jn as r,t as i}from"./src-Dbv9tx0f.js";import{n as a,t as o}from"./withAppStore-keQhFAQA.js";import{i as s,r as c,t as l}from"./exampleFlashcard-D6F52orK.js";import{t as u}from"./jsx-runtime-DeHZSEgm.js";import{n as ee,t as d}from"./createLucideIcon-DOl4OZ4-.js";import{n as f,t as p}from"./clsx-CTwy9ux-.js";import{n as m,t as h}from"./Button-DP1kBPxR.js";import{n as te,t as ne}from"./SegmentedControl-0UgXgm6H.js";import{n as re,t as ie}from"./TextField-rznLdn_0.js";import{n as ae,t as oe}from"./SelectField-DR_lm4h0.js";import{n as se,t as g}from"./CheckboxField-CEoaTgdO.js";import{n as ce,t as le}from"./ScreenLayout-CaeibNwm.js";import{i as _,n as ue}from"./languages-DxkjqGGG.js";import{n as de,t as fe}from"./TagsField-D7E2mVZd.js";import{a as v,i as pe,n as me,r as y}from"./flashcardFields-B3UVt5rv.js";import{a as he,i as b,n as x,r as S,t as C}from"./flashcardPresets-D7gCIyj5.js";import{n as ge,t as _e}from"./FlashcardPreview-DzOGKK-U.js";import{n as ve,t as ye}from"./CardSideToggle-D1KJZqub.js";import{n as w,r as be,t as T}from"./useMediaQuery-CncHBnEu.js";var E,D;function O(){return(O=e((()=>{ee(),E={name:`maximize-2`,size:24,node:[[`path`,{d:`M15 3h6v6`,key:`1q9fwt`}],[`path`,{d:`m21 3-7 7`,key:`1l2asr`}],[`path`,{d:`m3 21 7-7`,key:`tjx5ai`}],[`path`,{d:`M9 21H3v-6`,key:`wtvkvv`}]]},E.node,D=d(E)})))()}var k,A;function j(){return(j=e((()=>{ee(),k={name:`minimize-2`,size:24,node:[[`path`,{d:`m14 10 7-7`,key:`oa77jy`}],[`path`,{d:`M20 10h-6V4`,key:`mjg0md`}],[`path`,{d:`m3 21 7-7`,key:`tjx5ai`}],[`path`,{d:`M4 14h6v6`,key:`rmj7iw`}]]},k.node,A=d(k)})))()}function xe(e,t){switch(t.type){case`nameChanged`:return{...e,name:t.value};case`targetLanguageChanged`:return{...e,target_language:t.value};case`translationLanguageChanged`:return{...e,translation_language:t.value};case`presetChosen`:return{...e,flashcard_fields:C(t.preset),flashcard_front_fields:S(t.preset)};case`fieldToggled`:return{...e,flashcard_fields:r(e.flashcard_fields,t.key)};case`frontFieldToggled`:return{...e,flashcard_front_fields:r(e.flashcard_front_fields,t.key)};case`defaultTagsChanged`:return{...e,default_tags:[...t.tags]};case`mediaNameTagToggled`:return{...e,tags_media_name:!e.tags_media_name};case`ttsToggled`:return{...e,fills_audio_with_tts:!e.fills_audio_with_tts};case`deletionListingToggled`:return{...e,lists_anki_deletions:!e.lists_anki_deletions}}}function M(){return(M=e((()=>{i(),b()})))()}function Se({fields:e,frontFields:t,onPresetChosen:n,children:r}){let i=w(F),[a,o]=(0,N.useState)(!1),s=he(e,t),c=!i||s===`custom`,l=!i&&a?`custom`:s;return(0,P.jsxs)(P.Fragment,{children:[(0,P.jsx)(ne,{label:`Flashcard preset`,options:c?[...x,I]:x,value:l,onChange:e=>{e===`custom`?o(!0):(o(!1),n(e))}}),(0,P.jsx)(`div`,{className:p(!a&&`hidden sm:block`),children:r})]})}var N,P,F,I;function L(){return(L=e((()=>{f(),N=t(),te(),b(),T(),P=u(),F=`(min-width: 40rem)`,I={value:`custom`,label:`Custom`},Se.__docgenInfo={description:`The flashcard presets, with the field checkboxes under them. A preset sets both the fields and which of them are on the front.
On a roomy screen the checkboxes are always shown and "Custom" appears only once the selection matches no preset.
On a narrow screen the checkboxes stay hidden until "Custom" is chosen, which then shows as the preset.`,methods:[],displayName:`PresetPicker`,props:{fields:{required:!0,tsType:{name:`unknown`},description:``},frontFields:{required:!0,tsType:{name:`unknown`},description:``},onPresetChosen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(preset: FlashcardPreset) => void`,signature:{arguments:[{type:{name:`union`,raw:`"beginner" | "intermediate" | "advanced"`,elements:[{name:`literal`,value:`"beginner"`},{name:`literal`,value:`"intermediate"`},{name:`literal`,value:`"advanced"`}]},name:`preset`}],return:{name:`void`}}},description:``},children:{required:!0,tsType:{name:`ReactNode`},description:`The field checkboxes and the controls that put fields on the front or the back.`}}}})))()}function R({values:e,dispatch:t}){let[n,r]=(0,z.useState)(`target`),i={target:e.target_language,translation:e.translation_language};return(0,B.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,B.jsx)(`div`,{role:`tablist`,"aria-label":`Field groups`,className:`flex border-b border-line sm:hidden`,children:y.map(e=>(0,B.jsx)(`button`,{type:`button`,role:`tab`,"aria-selected":e===n,onClick:()=>r(e),className:p(`-mb-px border-b-2 px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent`,e===n?`border-accent font-medium text-fg`:`border-transparent text-fg-muted hover:text-fg`),children:v(e,i)},e))}),(0,B.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-3`,children:y.map(r=>(0,B.jsxs)(`fieldset`,{className:p(`flex-col gap-2`,r===n?`flex`:`hidden sm:flex`),children:[(0,B.jsx)(`legend`,{className:`mb-2 hidden text-xs font-medium text-fg-muted sm:block`,children:v(r,i)}),me.filter(e=>e.group===r).map(n=>{let r=n.label(i),a=e.flashcard_fields.includes(n.key);return(0,B.jsxs)(`div`,{className:`flex items-start justify-between gap-2`,children:[(0,B.jsx)(g,{label:r,checked:a,onChange:()=>t({type:`fieldToggled`,key:n.key})}),a&&n.key!==`tags`&&(0,B.jsx)(ye,{fieldLabel:r,isFront:e.flashcard_front_fields.includes(n.key),onToggle:()=>t({type:`frontFieldToggled`,key:n.key})})]},n.key)})]},r))})]})}var z,B;function V(){return(V=e((()=>{f(),z=t(),se(),pe(),ve(),B=u(),R.__docgenInfo={description:`The checkboxes for the fields a new flashcard starts with, grouped by language.
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
| { type: "deletionListingToggled" }`,elements:[{name:`signature`,type:`object`,raw:`{ type: "nameChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"nameChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "targetLanguageChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"targetLanguageChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "translationLanguageChanged"; value: string }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"translationLanguageChanged"`,required:!0}},{key:`value`,value:{name:`string`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "presetChosen"; preset: FlashcardPreset }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"presetChosen"`,required:!0}},{key:`preset`,value:{name:`union`,raw:`"beginner" | "intermediate" | "advanced"`,elements:[{name:`literal`,value:`"beginner"`},{name:`literal`,value:`"intermediate"`},{name:`literal`,value:`"advanced"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "fieldToggled"; key: FlashcardFieldKey }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"fieldToggled"`,required:!0}},{key:`key`,value:{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "frontFieldToggled"; key: FlashcardFieldKey }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"frontFieldToggled"`,required:!0}},{key:`key`,value:{name:`union`,raw:`"word" | "word_pronunciation" | "l1_definition" | "l2_definition" | "text_context" | "text_context_translation" | "text_context_pronunciation" | "audio_context" | "screenshot" | "tags"`,elements:[{name:`literal`,value:`"word"`},{name:`literal`,value:`"word_pronunciation"`},{name:`literal`,value:`"l1_definition"`},{name:`literal`,value:`"l2_definition"`},{name:`literal`,value:`"text_context"`},{name:`literal`,value:`"text_context_translation"`},{name:`literal`,value:`"text_context_pronunciation"`},{name:`literal`,value:`"audio_context"`},{name:`literal`,value:`"screenshot"`},{name:`literal`,value:`"tags"`}],required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "defaultTagsChanged"; tags: readonly string[] }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"defaultTagsChanged"`,required:!0}},{key:`tags`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "mediaNameTagToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"mediaNameTagToggled"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "ttsToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"ttsToggled"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ type: "deletionListingToggled" }`,signature:{properties:[{key:`type`,value:{name:`literal`,value:`"deletionListingToggled"`,required:!0}}]}}]},name:`action`}],return:{name:`void`}}},description:``}}}})))()}function H({values:e}){let t=w(be),[r,i]=(0,U.useState)(!1),a=e.tags_media_name?n(e.default_tags,[G]):[...e.default_tags];return(0,W.jsxs)(`aside`,{className:`flex flex-col gap-2 md:col-start-2 md:row-span-4 md:row-start-1 md:sticky md:top-4 md:self-start`,children:[(0,W.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,W.jsx)(`h2`,{className:`text-sm font-medium text-fg-muted`,children:`Example flashcard`}),(0,W.jsxs)(h,{size:`sm`,variant:`subtle`,className:`md:hidden`,onClick:()=>i(!r),children:[r?(0,W.jsx)(A,{className:`size-3`,"aria-hidden":!0}):(0,W.jsx)(D,{className:`size-3`,"aria-hidden":!0}),r?`Shrink`:`Expand`]})]}),(0,W.jsx)(_e,{content:{...l,tags:a},includedFields:e.flashcard_fields,frontFields:e.flashcard_front_fields,screenshotUrl:c,languages:{target:e.target_language,translation:e.translation_language},compact:!t&&!r})]})}var U,W,G;function Ce(){return(Ce=e((()=>{i(),O(),j(),U=t(),m(),s(),ge(),T(),W=u(),G=`dark-s01e01`,H.__docgenInfo={description:`The example flashcard under the form's current settings.
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
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},description:``}}}})))()}function we({initialValues:e,submitLabel:t,onSubmit:n,onCancel:r}){let[i,a]=(0,q.useReducer)(xe,e),o=(0,q.useId)(),s=i.target_language===i.translation_language;return(0,J.jsxs)(`form`,{className:`grid gap-6 md:grid-cols-[1fr_20rem] md:gap-x-8`,onSubmit:e=>{e.preventDefault(),s||n(i)},children:[(0,J.jsxs)(K,{children:[(0,J.jsx)(ie,{label:`Project name`,value:i.name,placeholder:`German`,required:!0,onChange:e=>a({type:`nameChanged`,value:e.target.value})}),(0,J.jsxs)(`div`,{className:`grid gap-4 sm:grid-cols-2`,children:[(0,J.jsx)(oe,{label:`Target language`,hint:`The language you are learning.`,options:_,value:i.target_language,onChange:e=>a({type:`targetLanguageChanged`,value:e.target.value})}),(0,J.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,J.jsx)(oe,{label:`Translation language`,hint:`Translations and definitions in this language.`,options:_,value:i.translation_language,"aria-invalid":s||void 0,"aria-describedby":s?o:void 0,onChange:e=>a({type:`translationLanguageChanged`,value:e.target.value})}),s&&(0,J.jsx)(`p`,{id:o,className:`text-xs text-danger-fg`,children:`Choose a different language from the target language.`})]})]})]}),(0,J.jsxs)(K,{children:[(0,J.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,J.jsx)(`h2`,{className:`text-base font-semibold`,children:`Flashcards`}),(0,J.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`Which fields a new flashcard starts with. You can add a hidden field back on any single flashcard.`})]}),(0,J.jsx)(Se,{fields:i.flashcard_fields,frontFields:i.flashcard_front_fields,onPresetChosen:e=>a({type:`presetChosen`,preset:e}),children:(0,J.jsx)(R,{values:i,dispatch:a})})]}),(0,J.jsx)(H,{values:i}),(0,J.jsxs)(K,{children:[(0,J.jsx)(fe,{label:`Default tags`,tags:i.default_tags,onChange:e=>a({type:`defaultTagsChanged`,tags:e})}),(0,J.jsx)(g,{label:`Tag each flashcard with the name of its media file`,checked:i.tags_media_name,onChange:()=>a({type:`mediaNameTagToggled`})}),(0,J.jsx)(g,{label:`Fill the audio fields with text-to-speech when the media has no audio track`,hint:`Applies to ebooks and text files.`,checked:i.fills_audio_with_tts,onChange:()=>a({type:`ttsToggled`})}),(0,J.jsx)(g,{label:`List deleted flashcards that are still in Anki`,hint:`When you delete a flashcard that an export flushed from the Anki updates queue, or that AnkiConnect sent to Anki, the project screen lists it so that you can delete it there too. Turning this off stops new ones from being listed; those already listed stay until you mark them done. While AnkiConnect is on, it deletes them from Anki itself.`,checked:i.lists_anki_deletions,onChange:()=>a({type:`deletionListingToggled`})})]}),(0,J.jsxs)(`div`,{className:`flex justify-end gap-2 md:col-start-1`,children:[(0,J.jsx)(h,{onClick:r,children:`Cancel`}),(0,J.jsx)(h,{variant:`primary`,type:`submit`,"aria-disabled":s||void 0,"aria-describedby":s?o:void 0,children:t})]})]})}function K({children:e}){return(0,J.jsx)(`div`,{className:`flex flex-col gap-4 md:col-start-1`,children:e})}var q,J;function Y(){return(Y=e((()=>{q=t(),m(),se(),ae(),de(),re(),M(),ue(),L(),V(),Ce(),J=u(),we.__docgenInfo={description:`The settings of a new or existing project, with a preview of a flashcard made under them.
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
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},name:`values`}],return:{name:`void`}}},description:``},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}function Te({mode:e,initialValues:t,onSubmit:n,onCancel:r}){return(0,X.jsxs)(le,{wide:!0,onBack:r,backLabel:e===`create`?`Projects`:`Project`,children:[(0,X.jsx)(`h1`,{className:`text-xl font-semibold`,children:e===`create`?`New project`:`Project settings`}),(0,X.jsx)(we,{initialValues:t,submitLabel:e===`create`?`Create project`:`Save settings`,onSubmit:n,onCancel:r})]})}var X;function Ee(){return(Ee=e((()=>{ce(),Y(),X=u(),Te.__docgenInfo={description:`The screen for creating a project or editing an existing project's settings. Back leads to the projects or to the project.`,methods:[],displayName:`ProjectSettingsView`,props:{mode:{required:!0,tsType:{name:`union`,raw:`"create" | "edit"`,elements:[{name:`literal`,value:`"create"`},{name:`literal`,value:`"edit"`}]},description:``},initialValues:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ name: string, 
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
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},name:`values`}],return:{name:`void`}}},description:``},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}var Z,De,Oe,ke,Q,Ae,je,Me;function $(){return($=e((()=>{b(),o(),Ee(),{fn:Z}=__STORYBOOK_MODULE_TEST__,De={title:`Projects/ProjectSettingsView`,component:Te,decorators:[a],parameters:{layout:`fullscreen`},args:{mode:`create`,initialValues:{name:``,target_language:`de`,translation_language:`en`,flashcard_fields:C(`beginner`),flashcard_front_fields:S(`beginner`),lists_anki_deletions:!0,default_tags:[],tags_media_name:!0,fills_audio_with_tts:!1},onSubmit:Z(),onCancel:Z()}},Oe={},ke={args:{initialValues:{name:``,target_language:`ja`,translation_language:`en`,flashcard_fields:C(`intermediate`),flashcard_front_fields:S(`intermediate`),lists_anki_deletions:!0,default_tags:[`tv`],tags_media_name:!0,fills_audio_with_tts:!0}}},Q={name:`German`,target_language:`de`,translation_language:`en`,flashcard_fields:C(`advanced`),flashcard_front_fields:S(`advanced`),lists_anki_deletions:!0,default_tags:[`tv`],tags_media_name:!1,fills_audio_with_tts:!1},Ae={args:{mode:`edit`,initialValues:Q}},je={args:{mode:`edit`,initialValues:{...Q,lists_anki_deletions:!1}}},Me=[`NewProject`,`NewProjectPrefilledFromLast`,`EditingSettings`,`EditingSettingsWithoutTheDeletionList`]})))()}$();export{Ae as EditingSettings,je as EditingSettingsWithoutTheDeletionList,Oe as NewProject,ke as NewProjectPrefilledFromLast,Me as __namedExportsOrder,De as default};