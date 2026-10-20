import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./Badge-BbZe08uC.js";import{n as i,t as a}from"./Button-KG4HKgfk.js";import{n as o,t as s}from"./chevron-right-_Tk2DK6J.js";import{n as c,t as l}from"./film-CBxm6usL.js";import{n as u,t as d}from"./graduation-cap-nHIo-B_l.js";import{n as f,t as p}from"./layers-DPwFgbH3.js";import{n as m}from"./pluralize-BdvhQ1v_.js";import{n as h,r as g}from"./Skeleton-CzqKx-Dl.js";import{n as _,r as v}from"./languages-DxkjqGGG.js";import{i as y,r as b,t as x}from"./flashcardPresets-D7gCIyj5.js";function S(e,t=Date.now()){let n=C(new Date(e),new Date(t));return n<=0?`today`:n>30?new Date(e).toLocaleDateString(`en`,{dateStyle:`medium`}):new Intl.RelativeTimeFormat(`en`,{numeric:`auto`}).format(-n,`day`)}function C(e,t){return Math.round((w(t)-w(e))/T)}function w(e){return new Date(e.getFullYear(),e.getMonth(),e.getDate()).getTime()}var T;function E(){return(E=e((()=>{T=864e5})))()}function D(e){return Date.now()-e*T}function O(e,t){return{name:e,target_language:t,translation_language:`en`,flashcard_fields:x(`intermediate`),default_tags:[],tags_media_name:!0,fills_audio_with_tts:!1,flashcard_front_fields:b(`intermediate`),lists_anki_deletions:!0}}var k,A,j,M,N;function P(){return(P=e((()=>{y(),E(),k={id:`project-german`,settings:O(`German`,`de`),created_at_ms:D(40),last_opened_at_ms:D(0),media_count:10,uses_anki_connect:!1,flashcard_count:184,unreviewed_count:20},A={id:`project-japanese`,settings:O(`Japanese`,`ja`),created_at_ms:D(12),last_opened_at_ms:D(1),media_count:3,uses_anki_connect:!1,flashcard_count:42,unreviewed_count:12},j={id:`project-spanish`,settings:O(`Intermediate Spanish`,`es`),created_at_ms:D(90),last_opened_at_ms:D(45),media_count:1,uses_anki_connect:!1,flashcard_count:7,unreviewed_count:0},M=[{project_id:`project-german`,due_count:6,learning_count:2,new_count:20},{project_id:`project-japanese`,due_count:0,learning_count:0,new_count:12},{project_id:`project-spanish`,due_count:0,learning_count:0,new_count:0}],N=[k,A,j]})))()}function F({project:e,review:t,onOpen:n,onReview:i}){let{name:a,target_language:o}=e.settings;return(0,R.jsxs)(`div`,{className:`flex items-center rounded-lg border border-line bg-surface has-[button:hover]:border-line-strong`,children:[(0,R.jsxs)(`button`,{type:`button`,onClick:()=>n(e.id),className:`group flex min-w-0 flex-1 items-center gap-4 rounded-lg px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`,children:[(0,R.jsx)(`span`,{"aria-hidden":!0,className:`flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent-fg uppercase`,children:o}),(0,R.jsxs)(`span`,{className:`flex min-w-0 flex-1 flex-col gap-1`,children:[(0,R.jsx)(`span`,{className:`truncate font-medium`,children:a}),(0,R.jsxs)(`span`,{className:`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted`,children:[(0,R.jsx)(r,{children:v(o)}),(0,R.jsxs)(`span`,{className:`flex items-center gap-1`,children:[(0,R.jsx)(l,{className:`size-3`,"aria-hidden":!0}),m(e.media_count,`media file`)]}),(0,R.jsxs)(`span`,{className:`flex items-center gap-1`,children:[(0,R.jsx)(p,{className:`size-3`,"aria-hidden":!0}),m(e.flashcard_count,`flashcard`)]}),(0,R.jsxs)(`span`,{children:[`Opened `,S(e.last_opened_at_ms)]})]})]}),(0,R.jsx)(s,{className:`size-4 shrink-0 text-fg-faint group-hover:text-fg`,"aria-hidden":!0})]}),t&&(0,R.jsx)(I,{projectId:e.id,review:t,onReview:i})]})}function I({projectId:e,review:t,onReview:n}){let r=t.due_count+t.learning_count;return r===0&&t.new_count===0?null:(0,R.jsxs)(a,{size:`sm`,variant:r>0?`primary`:`secondary`,className:`mr-3 shrink-0`,onClick:()=>n(e),children:[(0,R.jsx)(d,{className:`size-3.5`,"aria-hidden":!0}),r>0?(0,R.jsxs)(R.Fragment,{children:[`Review`,(0,R.jsxs)(`span`,{className:`tabular-nums opacity-80`,children:[r,` due`]})]}):`Learn`]})}function L(){return(0,R.jsxs)(`div`,{className:`flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3`,children:[(0,R.jsx)(h,{className:`size-10 shrink-0`}),(0,R.jsxs)(`div`,{className:`flex min-w-0 flex-1 flex-col gap-2`,children:[(0,R.jsx)(h,{className:`h-4 w-1/3`}),(0,R.jsx)(h,{className:`h-3 w-2/3`})]})]})}var R;function z(){return(z=e((()=>{o(),c(),u(),f(),n(),i(),g(),E(),_(),R=t(),F.__docgenInfo={description:`One project on the home screen, with its language, size, and when it was last opened.
Beside it, a button opens its review directly: to review the cards due, with their count, or to learn new cards when none is due.`,methods:[],displayName:`ProjectCard`,props:{project:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ id: ProjectId, settings: ProjectSettings, 
/**
 * Milliseconds since the Unix epoch.
 */
created_at_ms: number, 
/**
 * Milliseconds since the Unix epoch. Equal to \`created_at_ms\` until the project is first opened.
 */
last_opened_at_ms: number, media_count: number, flashcard_count: number, 
/**
 * The flashcards never answered in the review, less those the user buried or suspended.
 */
unreviewed_count: number, 
/**
 * Whether the project's flashcards are sent to Anki through AnkiConnect. The setup turns it on, and only the user turns it off.
 */
uses_anki_connect: boolean, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`settings`,value:{name:`signature`,type:`object`,raw:`{ name: string, 
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
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]},required:!0}},{key:`created_at_ms`,value:{name:`number`,required:!0},description:`Milliseconds since the Unix epoch.`},{key:`last_opened_at_ms`,value:{name:`number`,required:!0},description:"Milliseconds since the Unix epoch. Equal to `created_at_ms` until the project is first opened."},{key:`media_count`,value:{name:`number`,required:!0}},{key:`flashcard_count`,value:{name:`number`,required:!0}},{key:`unreviewed_count`,value:{name:`number`,required:!0},description:`The flashcards never answered in the review, less those the user buried or suspended.`},{key:`uses_anki_connect`,value:{name:`boolean`,required:!0},description:`Whether the project's flashcards are sent to Anki through AnkiConnect. The setup turns it on, and only the user turns it off.`}]}},description:``},review:{required:!0,tsType:{name:`union`,raw:`ReviewCounts | null`,elements:[{name:`signature`,type:`object`,raw:`{ project_id: ProjectId, 
/**
 * Cards under review that are due today, up to the day's limit.
 */
due_count: number, 
/**
 * Cards in learning or relearning that are due now or within the learn-ahead time.
 */
learning_count: number, 
/**
 * New cards that may still be introduced today.
 */
new_count: number, }`,signature:{properties:[{key:`project_id`,value:{name:`string`,required:!0}},{key:`due_count`,value:{name:`number`,required:!0},description:`Cards under review that are due today, up to the day's limit.`},{key:`learning_count`,value:{name:`number`,required:!0},description:`Cards in learning or relearning that are due now or within the learn-ahead time.`},{key:`new_count`,value:{name:`number`,required:!0},description:`New cards that may still be introduced today.`}]}},{name:`null`}]},description:`What waits in the project's review today, or null while that is not known.`},onOpen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(projectId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`projectId`}],return:{name:`void`}}},description:``},onReview:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(projectId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`projectId`}],return:{name:`void`}}},description:``}}},L.__docgenInfo={description:`A placeholder in the shape of a project card, shown while the projects load.`,methods:[],displayName:`ProjectCardSkeleton`}})))()}export{A as a,M as c,j as i,P as l,L as n,k as o,z as r,N as s,F as t};