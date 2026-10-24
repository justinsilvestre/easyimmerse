import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./Button-B-ZkWXW4.js";import{n as i,t as a}from"./circle-pause-B-G1fTVk.js";import{n as o,t as s}from"./x-DkeiZjTB.js";import{n as c,t as l}from"./IconButton-BLxIGtTh.js";import{n as u,t as d}from"./withAppStore-rzl2ivrE.js";import{i as f,t as p}from"./exampleFlashcard-D6F52orK.js";import{n as m,t as h}from"./FlashcardDeleteDialog-DByQo2Gh.js";import{n as g,t as _}from"./SuspendedStrip-2fnaZPfz.js";import{n as v,t as y}from"./FlashcardPreview-Dk6pCzUl.js";function b({content:e,settings:t,languages:n,screenshotUrl:i=null,ankiFate:o,isConfirmingDelete:c,onPlayAudio:u,onUnsuspend:d=null,onSuspend:f,onAskDelete:p,onCancelDelete:m,onDelete:g,onClose:v}){return(0,x.jsxs)(`section`,{"aria-label":`Flashcard from the library`,className:`flex h-full w-full flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-4 text-fg`,children:[(0,x.jsxs)(`div`,{className:`flex items-start justify-between gap-2`,children:[(0,x.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`This flashcard was made from the library, so it can't be edited.`}),(0,x.jsx)(l,{label:`Close`,onClick:v,children:(0,x.jsx)(s,{className:`size-4`})})]}),d&&(0,x.jsx)(`div`,{className:`overflow-hidden rounded-md border border-line`,children:(0,x.jsx)(_,{onUnsuspend:d})}),(0,x.jsx)(y,{content:e,includedFields:t.flashcard_fields,frontFields:t.flashcard_front_fields,languages:n,screenshotUrl:i,onPlayAudio:u}),(0,x.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[!d&&(0,x.jsxs)(r,{variant:`subtle`,onClick:f,children:[(0,x.jsx)(a,{className:`size-4`,"aria-hidden":!0}),`Suspend`]}),(0,x.jsx)(r,{variant:`danger`,onClick:p,children:`Delete flashcard`})]}),c&&(0,x.jsx)(h,{word:e.word,ankiFate:o,onCancel:m,onDelete:g})]})}var x;function S(){return(S=e((()=>{i(),o(),n(),c(),m(),v(),g(),x=t(),b.__docgenInfo={description:`A flashcard made from a library item, shown as it is reviewed, since the server fills it and refuses changes.
It can be closed, suspended, brought back into the review while suspended, or deleted after confirming in a dialog.`,methods:[],displayName:`LibraryFlashcardView`,props:{content:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ word: string, word_pronunciation: string, l1_definition: string, l2_definition: string, text_context: string, text_context_translation: string, text_context_pronunciation: string, audio_context: AudioClip | null, screenshot: Screenshot | null, tags: Array<string>, }`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`word_pronunciation`,value:{name:`string`,required:!0}},{key:`l1_definition`,value:{name:`string`,required:!0}},{key:`l2_definition`,value:{name:`string`,required:!0}},{key:`text_context`,value:{name:`string`,required:!0}},{key:`text_context_translation`,value:{name:`string`,required:!0}},{key:`text_context_pronunciation`,value:{name:`string`,required:!0}},{key:`audio_context`,value:{name:`union`,raw:`AudioClip | null`,elements:[{name:`signature`,type:`object`,raw:`{ start_ms: number, end_ms: number, }`,signature:{properties:[{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0}},{key:`screenshot`,value:{name:`union`,raw:`Screenshot | null`,elements:[{name:`signature`,type:`object`,raw:`{ at_ms: number, }`,signature:{properties:[{key:`at_ms`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0}},{key:`tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0}}]}},description:``},settings:{required:!0,tsType:{name:`Pick`,elements:[{name:`signature`,type:`object`,raw:`{ name: string, 
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
While AnkiConnect is on, deletions are recorded whatever this says, since AnkiConnect deletes the notes.`}]}},{name:`union`,raw:`"flashcard_fields" | "flashcard_front_fields"`,elements:[{name:`literal`,value:`"flashcard_fields"`},{name:`literal`,value:`"flashcard_front_fields"`}]}],raw:`Pick<
  ProjectSettings,
  "flashcard_fields" | "flashcard_front_fields"
>`},description:`The project's settings, which choose the fields on each side of the card.`},languages:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ target: string; translation: string }`,signature:{properties:[{key:`target`,value:{name:`string`,required:!0}},{key:`translation`,value:{name:`string`,required:!0}}]}},description:``},screenshotUrl:{required:!1,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``,defaultValue:{value:`null`,computed:!1}},ankiFate:{required:!0,tsType:{name:`union`,raw:`AnkiFateOfDeletion | null`,elements:[{name:`signature`,type:`object`,raw:`{
  /**
   * What becomes of its note in the user's Anki: there was none,
   * AnkiConnect deletes it now or, while the last check did not find Anki running, once easyImmerse next reaches Anki,
   * AnkiConnect deletes the note it has if the user imported it from a package that kept it in the queue, now or later,
   * or it stays until the user deletes it there, listed on the project screen or not.
   */
  note:
    | "none"
    | "deletedByAnkiConnect"
    | "deletedByAnkiConnectLater"
    | "anyDeletedByAnkiConnect"
    | "anyDeletedByAnkiConnectLater"
    | "staysListed"
    | "stays";
  /** Whether any package ever held the flashcard, so that importing one would bring it back. */
  wasPackaged: boolean;
}`,signature:{properties:[{key:`note`,value:{name:`union`,raw:`| "none"
| "deletedByAnkiConnect"
| "deletedByAnkiConnectLater"
| "anyDeletedByAnkiConnect"
| "anyDeletedByAnkiConnectLater"
| "staysListed"
| "stays"`,elements:[{name:`literal`,value:`"none"`},{name:`literal`,value:`"deletedByAnkiConnect"`},{name:`literal`,value:`"deletedByAnkiConnectLater"`},{name:`literal`,value:`"anyDeletedByAnkiConnect"`},{name:`literal`,value:`"anyDeletedByAnkiConnectLater"`},{name:`literal`,value:`"staysListed"`},{name:`literal`,value:`"stays"`}],required:!0},description:`What becomes of its note in the user's Anki: there was none,
AnkiConnect deletes it now or, while the last check did not find Anki running, once easyImmerse next reaches Anki,
AnkiConnect deletes the note it has if the user imported it from a package that kept it in the queue, now or later,
or it stays until the user deletes it there, listed on the project screen or not.`},{key:`wasPackaged`,value:{name:`boolean`,required:!0},description:`Whether any package ever held the flashcard, so that importing one would bring it back.`}]}},{name:`null`}]},description:``},isConfirmingDelete:{required:!0,tsType:{name:`boolean`},description:`Whether the deletion waits for confirmation in its dialog.`},onPlayAudio:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onUnsuspend:{required:!1,tsType:{name:`union`,raw:`(() => void) | null`,elements:[{name:`unknown`},{name:`null`}]},description:`Brings the suspended flashcard back into the review. Null, the default, for a flashcard that is not suspended.`,defaultValue:{value:`null`,computed:!1}},onSuspend:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Leaves the flashcard out of the review. The button shows only while the flashcard is not suspended.`},onAskDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onCancelDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}var C,w,T,E,D,O,k,A;function j(){return(j=e((()=>{d(),f(),S(),C=t(),{fn:w}=__STORYBOOK_MODULE_TEST__,T={title:`Components/Flashcard Editor/LibraryFlashcardView`,component:b,decorators:[u,e=>(0,C.jsx)(`div`,{className:`h-[36rem] max-w-sm`,children:(0,C.jsx)(e,{})})],args:{content:p,settings:{flashcard_fields:[`word`,`l1_definition`,`text_context`,`audio_context`,`screenshot`],flashcard_front_fields:[`text_context`]},languages:{target:`de`,translation:`en`},ankiFate:null,isConfirmingDelete:!1,onPlayAudio:w(),onUnsuspend:null,onSuspend:w(),onAskDelete:w(),onCancelDelete:w(),onDelete:w(),onClose:w()}},E={},D={args:{content:{...p,audio_context:null,screenshot:null},onPlayAudio:void 0}},O={args:{onUnsuspend:w()}},k={args:{isConfirmingDelete:!0}},A=[`FromAVideo`,`FromAText`,`Suspended`,`ConfirmingDelete`]})))()}j();export{k as ConfirmingDelete,D as FromAText,E as FromAVideo,O as Suspended,A as __namedExportsOrder,T as default};