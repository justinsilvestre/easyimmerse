import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./chevron-right-CHavNnq6.js";import{n as i,t as a}from"./film-Bpi_M0di.js";import{n as o,t as s}from"./graduation-cap-Cn7d_cEI.js";import{n as c,t as l}from"./layers-BOxhRG0r.js";import{n as u,t as d}from"./Button-DP1kBPxR.js";import{n as f,t as p}from"./Badge-CIeprCRm.js";import{n as m,r as h,t as g}from"./formatRelativeDate-I7LAZ4D2.js";import{n as _}from"./pluralize-BdvhQ1v_.js";import{n as v,r as y}from"./Skeleton-F82dK4YH.js";import{n as b,r as x}from"./languages-DxkjqGGG.js";import{i as S,r as C,t as w}from"./flashcardPresets-D7gCIyj5.js";function T(e){return Date.now()-e*g}function E(e,t){return{name:e,target_language:t,translation_language:`en`,flashcard_fields:w(`intermediate`),default_tags:[],tags_media_name:!0,fills_audio_with_tts:!1,flashcard_front_fields:C(`intermediate`),lists_anki_deletions:!0}}var D,O,k,A,j;function M(){return(M=e((()=>{S(),h(),D={id:`project-german`,settings:E(`German`,`de`),created_at_ms:T(40),last_opened_at_ms:T(0),media_count:10,uses_anki_connect:!1,is_backed_up:!1,flashcard_count:184,unreviewed_count:20},O={id:`project-japanese`,settings:E(`Japanese`,`ja`),created_at_ms:T(12),last_opened_at_ms:T(1),media_count:3,uses_anki_connect:!1,is_backed_up:!1,flashcard_count:42,unreviewed_count:12},k={id:`project-spanish`,settings:E(`Intermediate Spanish`,`es`),created_at_ms:T(90),last_opened_at_ms:T(45),media_count:1,uses_anki_connect:!1,is_backed_up:!1,flashcard_count:7,unreviewed_count:0},A=[{project_id:`project-german`,due_count:6,learning_count:2,new_count:20},{project_id:`project-japanese`,due_count:0,learning_count:0,new_count:12},{project_id:`project-spanish`,due_count:0,learning_count:0,new_count:0}],j=[D,O,k]})))()}function N({project:e,review:t,onOpen:n,onReview:i}){let{name:o,target_language:s}=e.settings;return(0,I.jsxs)(`div`,{className:`flex flex-col rounded-lg border border-line bg-surface has-[button:hover]:border-line-strong sm:flex-row sm:items-center`,children:[(0,I.jsxs)(`button`,{type:`button`,onClick:()=>n(e.id),className:`group flex min-w-0 flex-1 items-center gap-4 rounded-lg px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`,children:[(0,I.jsx)(`span`,{"aria-hidden":!0,className:`flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent-fg uppercase`,children:s}),(0,I.jsxs)(`span`,{className:`flex min-w-0 flex-1 flex-col gap-1`,children:[(0,I.jsx)(`span`,{className:`truncate font-medium`,children:o}),(0,I.jsxs)(`span`,{className:`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted`,children:[(0,I.jsx)(p,{children:x(s)}),(0,I.jsxs)(`span`,{className:`flex items-center gap-1`,children:[(0,I.jsx)(a,{className:`size-3`,"aria-hidden":!0}),_(e.media_count,`media file`)]}),(0,I.jsxs)(`span`,{className:`flex items-center gap-1`,children:[(0,I.jsx)(l,{className:`size-3`,"aria-hidden":!0}),_(e.flashcard_count,`flashcard`)]}),(0,I.jsxs)(`span`,{children:[`Opened `,m(e.last_opened_at_ms)]})]})]}),(0,I.jsx)(r,{className:`size-4 shrink-0 text-fg-faint group-hover:text-fg`,"aria-hidden":!0})]}),t&&(0,I.jsx)(P,{projectId:e.id,review:t,onReview:i})]})}function P({projectId:e,review:t,onReview:n}){let r=t.due_count+t.learning_count;return r===0&&t.new_count===0?null:(0,I.jsxs)(d,{size:`sm`,variant:r>0?`primary`:`secondary`,className:`mx-3 mb-3 shrink-0 sm:my-0 sm:mr-3 sm:ml-0`,onClick:()=>n(e),children:[(0,I.jsx)(s,{className:`size-3.5`,"aria-hidden":!0}),r>0?(0,I.jsxs)(I.Fragment,{children:[`Review`,(0,I.jsxs)(`span`,{className:`tabular-nums opacity-80`,children:[r,` due`]})]}):`Learn`]})}function F(){return(0,I.jsxs)(`div`,{className:`flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3`,children:[(0,I.jsx)(v,{className:`size-10 shrink-0`}),(0,I.jsxs)(`div`,{className:`flex min-w-0 flex-1 flex-col gap-2`,children:[(0,I.jsx)(v,{className:`h-4 w-1/3`}),(0,I.jsx)(v,{className:`h-3 w-2/3`})]})]})}var I;function L(){return(L=e((()=>{n(),i(),o(),c(),f(),u(),y(),h(),b(),I=t(),N.__docgenInfo={description:`One project on the home screen, with its language, size, and when it was last opened.
Beside it, or under it at phone width, a button opens its review directly: to review the cards due, with their count, or to learn new cards when none is due.`,methods:[],displayName:`ProjectCard`,props:{project:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ id: ProjectId, settings: ProjectSettings, 
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
uses_anki_connect: boolean, 
/**
 * Whether a copy of the project's latest change is kept on a server other than this device's own.
 * Always true for an account's projects, which live on the server it is logged in to.
 */
is_backed_up: boolean, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`settings`,value:{name:`signature`,type:`object`,raw:`{ name: string, 
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
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]},required:!0}},{key:`created_at_ms`,value:{name:`number`,required:!0},description:`Milliseconds since the Unix epoch.`},{key:`last_opened_at_ms`,value:{name:`number`,required:!0},description:"Milliseconds since the Unix epoch. Equal to `created_at_ms` until the project is first opened."},{key:`media_count`,value:{name:`number`,required:!0}},{key:`flashcard_count`,value:{name:`number`,required:!0}},{key:`unreviewed_count`,value:{name:`number`,required:!0},description:`The flashcards never answered in the review, less those the user buried or suspended.`},{key:`uses_anki_connect`,value:{name:`boolean`,required:!0},description:`Whether the project's flashcards are sent to Anki through AnkiConnect. The setup turns it on, and only the user turns it off.`},{key:`is_backed_up`,value:{name:`boolean`,required:!0},description:`Whether a copy of the project's latest change is kept on a server other than this device's own.
Always true for an account's projects, which live on the server it is logged in to.`}]}},description:``},review:{required:!0,tsType:{name:`union`,raw:`ReviewCounts | null`,elements:[{name:`signature`,type:`object`,raw:`{ project_id: ProjectId, 
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
new_count: number, }`,signature:{properties:[{key:`project_id`,value:{name:`string`,required:!0}},{key:`due_count`,value:{name:`number`,required:!0},description:`Cards under review that are due today, up to the day's limit.`},{key:`learning_count`,value:{name:`number`,required:!0},description:`Cards in learning or relearning that are due now or within the learn-ahead time.`},{key:`new_count`,value:{name:`number`,required:!0},description:`New cards that may still be introduced today.`}]}},{name:`null`}]},description:`What waits in the project's review today, or null while that is not known.`},onOpen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(projectId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`projectId`}],return:{name:`void`}}},description:``},onReview:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(projectId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`projectId`}],return:{name:`void`}}},description:``}}},F.__docgenInfo={description:`A placeholder in the shape of a project card, shown while the projects load.`,methods:[],displayName:`ProjectCardSkeleton`}})))()}export{O as a,A as c,k as i,M as l,F as n,D as o,L as r,j as s,N as t};