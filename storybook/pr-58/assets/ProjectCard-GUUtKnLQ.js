import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./chevron-right-DHC8hJXP.js";import{n as i,t as a}from"./film-CVsFnIqk.js";import{n as o,t as s}from"./graduation-cap-BIPQ4LOp.js";import{n as c,t as l}from"./layers-WVV4Nac6.js";import{n as u,t as d}from"./Button-DP1kBPxR.js";import{n as f,t as p}from"./Badge-CIeprCRm.js";import{n as m,r as h}from"./formatRelativeDate-I7LAZ4D2.js";import{n as g}from"./pluralize-BdvhQ1v_.js";import{n as _,r as v}from"./Skeleton-F82dK4YH.js";import{n as y,r as b}from"./languages-DxkjqGGG.js";function x({project:e,review:t,onOpen:n,onReview:i}){let{name:o,target_language:s}=e.settings;return(0,w.jsxs)(`div`,{className:`flex flex-col rounded-lg border border-line bg-surface has-[button:hover]:border-line-strong sm:flex-row sm:items-center`,children:[(0,w.jsxs)(`button`,{type:`button`,onClick:()=>n(e.id),className:`group flex min-w-0 flex-1 items-center gap-4 rounded-lg px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`,children:[(0,w.jsx)(`span`,{"aria-hidden":!0,className:`flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent-fg uppercase`,children:s}),(0,w.jsxs)(`span`,{className:`flex min-w-0 flex-1 flex-col gap-1`,children:[(0,w.jsx)(`span`,{className:`truncate font-medium`,children:o}),(0,w.jsxs)(`span`,{className:`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted`,children:[(0,w.jsx)(p,{children:b(s)}),(0,w.jsxs)(`span`,{className:`flex items-center gap-1`,children:[(0,w.jsx)(a,{className:`size-3`,"aria-hidden":!0}),g(e.media_count,`media file`)]}),(0,w.jsxs)(`span`,{className:`flex items-center gap-1`,children:[(0,w.jsx)(l,{className:`size-3`,"aria-hidden":!0}),g(e.flashcard_count,`flashcard`)]}),(0,w.jsxs)(`span`,{children:[`Opened `,m(e.last_opened_at_ms)]})]})]}),(0,w.jsx)(r,{className:`size-4 shrink-0 text-fg-faint group-hover:text-fg`,"aria-hidden":!0})]}),t&&(0,w.jsx)(S,{projectId:e.id,review:t,onReview:i})]})}function S({projectId:e,review:t,onReview:n}){let r=t.due_count+t.learning_count;return r===0&&t.new_count===0?null:(0,w.jsxs)(d,{size:`sm`,variant:r>0?`primary`:`secondary`,className:`mx-3 mb-3 shrink-0 sm:my-0 sm:mr-3 sm:ml-0`,onClick:()=>n(e),children:[(0,w.jsx)(s,{className:`size-3.5`,"aria-hidden":!0}),r>0?(0,w.jsxs)(w.Fragment,{children:[`Review`,(0,w.jsxs)(`span`,{className:`tabular-nums opacity-80`,children:[r,` due`]})]}):`Learn`]})}function C(){return(0,w.jsxs)(`div`,{className:`flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3`,children:[(0,w.jsx)(_,{className:`size-10 shrink-0`}),(0,w.jsxs)(`div`,{className:`flex min-w-0 flex-1 flex-col gap-2`,children:[(0,w.jsx)(_,{className:`h-4 w-1/3`}),(0,w.jsx)(_,{className:`h-3 w-2/3`})]})]})}var w;function T(){return(T=e((()=>{n(),i(),o(),c(),f(),u(),v(),h(),y(),w=t(),x.__docgenInfo={description:`One project on the home screen, with its language, size, and when it was last opened.
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
new_count: number, }`,signature:{properties:[{key:`project_id`,value:{name:`string`,required:!0}},{key:`due_count`,value:{name:`number`,required:!0},description:`Cards under review that are due today, up to the day's limit.`},{key:`learning_count`,value:{name:`number`,required:!0},description:`Cards in learning or relearning that are due now or within the learn-ahead time.`},{key:`new_count`,value:{name:`number`,required:!0},description:`New cards that may still be introduced today.`}]}},{name:`null`}]},description:`What waits in the project's review today, or null while that is not known.`},onOpen:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(projectId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`projectId`}],return:{name:`void`}}},description:``},onReview:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(projectId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`projectId`}],return:{name:`void`}}},description:``}}},C.__docgenInfo={description:`A placeholder in the shape of a project card, shown while the projects load.`,methods:[],displayName:`ProjectCardSkeleton`}})))()}export{C as n,T as r,x as t};