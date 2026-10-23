import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./Button-DP1kBPxR.js";import{n as i,t as a}from"./ModalDialog-CPylhOX4.js";function o({word:e,ankiFate:t,onCancel:n,onDelete:i}){return(0,c.jsx)(a,{title:`Delete this flashcard?`,description:s(e,t),onCancel:n,footer:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(r,{autoFocus:!0,onClick:n,children:`Cancel`}),(0,c.jsx)(r,{variant:`danger`,onClick:i,children:`Delete`})]})})}function s(e,t){let n=[`The flashcard for “${e}” is deleted from the project. The deletion cannot be undone.`];return t!==null&&(n.push(l[t.note]),t.wasPackaged&&n.push(`Importing a package made before now that holds it would bring it back.`)),n.filter(e=>e!==``).join(` `)}var c,l;function u(){return(u=e((()=>{n(),i(),c=t(),l={none:``,deletedByAnkiConnect:`Its note is deleted from Anki too.`,deletedByAnkiConnectLater:`Its note is deleted from Anki the next time easyImmerse reaches Anki.`,anyDeletedByAnkiConnect:`If you imported it into Anki from a package, its note there is deleted too.`,anyDeletedByAnkiConnectLater:`If you imported it into Anki from a package, its note there is deleted the next time easyImmerse reaches Anki.`,staysListed:`Its corresponding Anki note stays in Anki until you delete it there or turn AnkiConnect on. A record of deleted flashcards is kept for your reference in the project screen.`,stays:`Its corresponding Anki note stays in Anki until you delete it there.`},o.__docgenInfo={description:`Asks whether to delete a flashcard, naming its word and telling what becomes of it in Anki, when that is known.
Cancel has focus, so that Enter does not delete.`,methods:[],displayName:`FlashcardDeleteDialog`,props:{word:{required:!0,tsType:{name:`string`},description:``},ankiFate:{required:!0,tsType:{name:`union`,raw:`AnkiFateOfDeletion | null`,elements:[{name:`signature`,type:`object`,raw:`{
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
or it stays until the user deletes it there, listed on the project screen or not.`},{key:`wasPackaged`,value:{name:`boolean`,required:!0},description:`Whether any package ever held the flashcard, so that importing one would bring it back.`}]}},{name:`null`}]},description:`What deleting the flashcard does to its note in Anki, or null when that is not known.`},onCancel:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}export{u as n,o as t};