import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./Badge-BbZe08uC.js";import{n as i,r as a}from"./Button-CD6768H-.js";import{n as o,t as s}from"./chevron-right-DIZG_c2x.js";import{n as c,t as l}from"./film-CBQqR2zY.js";import{n as u,t as d}from"./graduation-cap-fZHiU9PB.js";import{n as f,t as p}from"./layers-BZOrRPkE.js";import{n as m,r as h}from"./Skeleton-CzqKx-Dl.js";import{t as g,yn as _}from"./src-SWph5oq4.js";import{n as v,r as y}from"./languages-DxkjqGGG.js";import{n as b}from"./pluralize-BdvhQ1v_.js";import{n as x,r as S}from"./formatRelativeDate-I7LAZ4D2.js";function C({project:e,review:t}){let{name:n,target_language:i}=e.settings;return(0,E.jsxs)(`div`,{className:`flex flex-col rounded-lg border border-line bg-surface has-[a:hover]:border-line-strong sm:flex-row sm:items-center`,children:[(0,E.jsxs)(`a`,{href:_({screen:`project`,projectId:e.id}),className:`group flex min-w-0 flex-1 items-center gap-4 rounded-lg px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`,children:[(0,E.jsx)(`span`,{"aria-hidden":!0,className:`flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent-fg uppercase`,children:i}),(0,E.jsxs)(`span`,{className:`flex min-w-0 flex-1 flex-col gap-1`,children:[(0,E.jsx)(`span`,{className:`truncate font-medium`,children:n}),(0,E.jsxs)(`span`,{className:`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted`,children:[(0,E.jsx)(r,{children:y(i)}),(0,E.jsxs)(`span`,{className:`flex items-center gap-1`,children:[(0,E.jsx)(l,{className:`size-3`,"aria-hidden":!0}),b(e.media_count,`media file`)]}),(0,E.jsxs)(`span`,{className:`flex items-center gap-1`,children:[(0,E.jsx)(p,{className:`size-3`,"aria-hidden":!0}),b(e.flashcard_count,`flashcard`)]}),(0,E.jsxs)(`span`,{children:[`Opened `,x(e.last_opened_at_ms)]})]})]}),(0,E.jsx)(s,{className:`size-4 shrink-0 text-fg-faint group-hover:text-fg`,"aria-hidden":!0})]}),t&&(0,E.jsx)(w,{projectId:e.id,review:t})]})}function w({projectId:e,review:t}){let n=t.due_count+t.learning_count;return n===0&&t.new_count===0?null:(0,E.jsxs)(i,{size:`sm`,variant:n>0?`primary`:`secondary`,className:`mx-3 mb-3 shrink-0 sm:my-0 sm:mr-3 sm:ml-0`,href:_({screen:`review`,projectId:e}),children:[(0,E.jsx)(d,{className:`size-3.5`,"aria-hidden":!0}),n>0?(0,E.jsxs)(E.Fragment,{children:[`Review`,(0,E.jsxs)(`span`,{className:`tabular-nums opacity-80`,children:[n,` due`]})]}):`Learn`]})}function T(){return(0,E.jsxs)(`div`,{className:`flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3`,children:[(0,E.jsx)(m,{className:`size-10 shrink-0`}),(0,E.jsxs)(`div`,{className:`flex min-w-0 flex-1 flex-col gap-2`,children:[(0,E.jsx)(m,{className:`h-4 w-1/3`}),(0,E.jsx)(m,{className:`h-3 w-2/3`})]})]})}var E;function D(){return(D=e((()=>{g(),o(),c(),u(),f(),n(),a(),h(),S(),v(),E=t(),C.__docgenInfo={description:`One project on the home screen, with its language, size, and when it was last opened.
The card links to the project's screen. Beside it, or under it at phone width, a link opens its review directly: to review the cards due, with their count, or to learn new cards when none is due.`,methods:[],displayName:`ProjectCard`,props:{project:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ id: ProjectId, settings: ProjectSettings, 
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
new_count: number, }`,signature:{properties:[{key:`project_id`,value:{name:`string`,required:!0}},{key:`due_count`,value:{name:`number`,required:!0},description:`Cards under review that are due today, up to the day's limit.`},{key:`learning_count`,value:{name:`number`,required:!0},description:`Cards in learning or relearning that are due now or within the learn-ahead time.`},{key:`new_count`,value:{name:`number`,required:!0},description:`New cards that may still be introduced today.`}]}},{name:`null`}]},description:`What waits in the project's review today, or null while that is not known.`}}},T.__docgenInfo={description:`A placeholder in the shape of a project card, shown while the projects load.`,methods:[],displayName:`ProjectCardSkeleton`}})))()}export{T as n,D as r,C as t};