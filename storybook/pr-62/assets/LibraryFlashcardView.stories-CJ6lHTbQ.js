import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./Button-B-ZkWXW4.js";import{n as i,t as a}from"./x-ADAFZwvF.js";import{n as o,t as s}from"./IconButton-BLxIGtTh.js";import{n as c,t as l}from"./withAppStore-BddT-s5Q.js";import{i as u,t as d}from"./exampleFlashcard-D6F52orK.js";import{n as f,t as p}from"./FlashcardDeleteDialog-CNjQuagh.js";import{n as m,t as h}from"./SuspendedStrip-2fnaZPfz.js";import{n as g,t as _}from"./FlashcardPreview-DFgCBHEX.js";function v({content:e,settings:t,languages:n,screenshotUrl:i=null,ankiFate:o,isConfirmingDelete:c,onPlayAudio:l,onUnsuspend:u=null,onAskDelete:d,onCancelDelete:f,onDelete:m,onClose:g}){return(0,y.jsxs)(`section`,{"aria-label":`Flashcard from the library`,className:`flex h-full w-full flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-4 text-fg`,children:[(0,y.jsxs)(`div`,{className:`flex items-start justify-between gap-2`,children:[(0,y.jsx)(`p`,{className:`text-sm text-fg-muted`,children:`This flashcard was made from the library, so it can't be edited.`}),(0,y.jsx)(s,{label:`Close`,onClick:g,children:(0,y.jsx)(a,{className:`size-4`})})]}),u&&(0,y.jsx)(`div`,{className:`overflow-hidden rounded-md border border-line`,children:(0,y.jsx)(h,{onUnsuspend:u})}),(0,y.jsx)(_,{content:e,includedFields:t.flashcard_fields,frontFields:t.flashcard_front_fields,languages:n,screenshotUrl:i,onPlayAudio:l}),(0,y.jsx)(`div`,{children:(0,y.jsx)(r,{variant:`danger`,onClick:d,children:`Delete flashcard`})}),c&&(0,y.jsx)(p,{word:e.word,ankiFate:o,onCancel:f,onDelete:m})]})}var y;function b(){return(b=e((()=>{i(),n(),o(),f(),g(),m(),y=t(),v.__docgenInfo={description:`A flashcard made from a library item, shown as it is reviewed, since the server fills it and refuses changes.
It can be closed, brought back into the review while suspended, or deleted after confirming in a dialog.`,methods:[],displayName:`LibraryFlashcardView`,props:{content:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ word: string, word_pronunciation: string, l1_definition: string, l2_definition: string, text_context: string, text_context_translation: string, text_context_pronunciation: string, audio_context: AudioClip | null, screenshot: Screenshot | null, tags: Array<string>, }`,signature:{properties:[{key:`word`,value:{name:`string`,required:!0}},{key:`word_pronunciation`,value:{name:`string`,required:!0}},{key:`l1_definition`,value:{name:`string`,required:!0}},{key:`l2_definition`,value:{name:`string`,required:!0}},{key:`text_context`,value:{name:`string`,required:!0}},{key:`text_context_translation`,value:{name:`string`,required:!0}},{key:`text_context_pronunciation`,value:{name:`string`,required:!0}},{key:`audio_context`,value:{name:`union`,raw:`AudioClip | null`,elements:[{name:`signature`,type:`object`,raw:`{ start_ms: number, end_ms: number, }`,signature:{properties:[{key:`start_ms`,value:{name:`number`,required:!0}},{key:`end_ms`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0}},{key:`screenshot`,value:{name:`union`,raw:`Screenshot | null`,elements:[{name:`signature`,type:`object`,raw:`{ at_ms: number, }`,signature:{properties:[{key:`at_ms`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0}},{key:`tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0}}]}},description:``},settings:{required:!0,tsType:{name:`Pick`,elements:[{name:`signature`,type:`object`,raw:`{ name: string, 
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
or it stays until the user deletes it there, listed on the project screen or not.`},{key:`wasPackaged`,value:{name:`boolean`,required:!0},description:`Whether any package ever held the flashcard, so that importing one would bring it back.`}]}},{name:`null`}]},description:``},isConfirmingDelete:{required:!0,tsType:{name:`boolean`},description:`Whether the deletion waits for confirmation in its dialog.`},onPlayAudio:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onUnsuspend:{required:!1,tsType:{name:`union`,raw:`(() => void) | null`,elements:[{name:`unknown`},{name:`null`}]},description:`Brings the suspended flashcard back into the review. Null, the default, for a flashcard that is not suspended.`,defaultValue:{value:`null`,computed:!1}},onAskDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onCancelDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}var x,S,C,w,T,E,D,O;function k(){return(k=e((()=>{l(),u(),b(),x=t(),{fn:S}=__STORYBOOK_MODULE_TEST__,C={title:`Components/Flashcard Editor/LibraryFlashcardView`,component:v,decorators:[c,e=>(0,x.jsx)(`div`,{className:`h-[36rem] max-w-sm`,children:(0,x.jsx)(e,{})})],args:{content:d,settings:{flashcard_fields:[`word`,`l1_definition`,`text_context`,`audio_context`,`screenshot`],flashcard_front_fields:[`text_context`]},languages:{target:`de`,translation:`en`},ankiFate:null,isConfirmingDelete:!1,onPlayAudio:S(),onUnsuspend:null,onAskDelete:S(),onCancelDelete:S(),onDelete:S(),onClose:S()}},w={},T={args:{content:{...d,audio_context:null,screenshot:null},onPlayAudio:void 0}},E={args:{onUnsuspend:S()}},D={args:{isConfirmingDelete:!0}},O=[`FromAVideo`,`FromAText`,`Suspended`,`ConfirmingDelete`]})))()}k();export{D as ConfirmingDelete,T as FromAText,w as FromAVideo,E as Suspended,O as __namedExportsOrder,C as default};