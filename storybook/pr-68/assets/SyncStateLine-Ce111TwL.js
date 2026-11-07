import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{n as t,t as n}from"./clsx-CTwy9ux-.js";import{t as r}from"./jsx-runtime-DeHZSEgm.js";function i({link:e,serverName:t}){let r=e.state.kind===`idle`||e.state.kind===`syncing`;return(0,o.jsx)(`span`,{role:`status`,className:n(!r&&`text-warning-fg`),children:a(e,t)})}function a({state:e,last_synced_at_ms:t},n){switch(e.kind){case`idle`:return`Up to date`;case`syncing`:return t===null?`Backing up your work to ${n}…`:`Synchronizing…`;case`unreachable`:return`Couldn't reach ${n}`;case`logged_out`:return`Logged out`;case`failed`:return`Couldn't back up to ${n}`}}var o;function s(){return(s=e((()=>{t(),o=r(),i.__docgenInfo={description:`Tells in one line how backing the work up to the linked server fares.`,methods:[],displayName:`SyncStateLine`,props:{link:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ kind: RemoteKind, server_url: string, account_email: string, account_role: AccountRole, linked_at_ms: number, 
/**
 * When the latest successful round began. Every change made on this device before then is on the remote.
 */
last_synced_at_ms: number | null, 
/**
 * This server's change sequence up to which the remote holds every change.
 */
pushed_through_seq: number, state: SyncLinkState, 
/**
 * The media file being uploaded, while one is.
 */
transfer: MediaTransfer | null, 
/**
 * None when the latest round found room on the remote for every media file chosen for a copy there.
 */
refused_upload: RefusedUpload | null, 
/**
 * The 20 most recent conflicts, newest first.
 */
conflicts: Array<SyncConflict>, 
/**
 * How many conflicts there are since they were last dismissed.
 */
conflict_count: number, }`,signature:{properties:[{key:`kind`,value:{name:`union`,raw:`"account" | "lan"`,elements:[{name:`literal`,value:`"account"`},{name:`literal`,value:`"lan"`}],required:!0}},{key:`server_url`,value:{name:`string`,required:!0}},{key:`account_email`,value:{name:`string`,required:!0}},{key:`account_role`,value:{name:`union`,raw:`"library_user" | "privileged" | "administrator"`,elements:[{name:`literal`,value:`"library_user"`},{name:`literal`,value:`"privileged"`},{name:`literal`,value:`"administrator"`}],required:!0}},{key:`linked_at_ms`,value:{name:`number`,required:!0}},{key:`last_synced_at_ms`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!0},description:`When the latest successful round began. Every change made on this device before then is on the remote.`},{key:`pushed_through_seq`,value:{name:`number`,required:!0},description:`This server's change sequence up to which the remote holds every change.`},{key:`state`,value:{name:`union`,raw:`{ "kind": "idle" } | { "kind": "syncing" } | { "kind": "unreachable", since_ms: number, } | { "kind": "logged_out" } | { "kind": "failed", code: string, message: string, }`,elements:[{name:`signature`,type:`object`,raw:`{ "kind": "idle" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"idle"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "syncing" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"syncing"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "unreachable", since_ms: number, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"unreachable"`,required:!0}},{key:`since_ms`,value:{name:`number`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "logged_out" }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"logged_out"`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ "kind": "failed", code: string, message: string, }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`"failed"`,required:!0}},{key:`code`,value:{name:`string`,required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}}],required:!0}},{key:`transfer`,value:{name:`union`,raw:`MediaTransfer | null`,elements:[{name:`signature`,type:`object`,raw:`{ media_file_id: MediaFileId, name: string, sent_bytes: number, total_bytes: number, }`,signature:{properties:[{key:`media_file_id`,value:{name:`string`,required:!0}},{key:`name`,value:{name:`string`,required:!0}},{key:`sent_bytes`,value:{name:`number`,required:!0}},{key:`total_bytes`,value:{name:`number`,required:!0}}]}},{name:`null`}],required:!0},description:`The media file being uploaded, while one is.`},{key:`refused_upload`,value:{name:`union`,raw:`RefusedUpload | null`,elements:[{name:`signature`,type:`object`,raw:`{ media_file_id: MediaFileId, name: string, code: string, message: string, }`,signature:{properties:[{key:`media_file_id`,value:{name:`string`,required:!0}},{key:`name`,value:{name:`string`,required:!0}},{key:`code`,value:{name:`string`,required:!0}},{key:`message`,value:{name:`string`,required:!0}}]}},{name:`null`}],required:!0},description:`None when the latest round found room on the remote for every media file chosen for a copy there.`},{key:`conflicts`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ id: string, 
/**
 * Names the row itself for the person, such as "a flashcard" or "the reading position".
 */
description: string, 
/**
 * The name of the project the row belongs to, when it belongs to one that was known when the conflict was recorded.
 */
project_name: string | null, 
/**
 * The name of the media file the row belongs to, when it belongs to one that was known when the conflict was recorded.
 */
media_file_name: string | null, kept: ConflictKept, detected_at_ms: number, }`,signature:{properties:[{key:`id`,value:{name:`string`,required:!0}},{key:`description`,value:{name:`string`,required:!0},description:`Names the row itself for the person, such as "a flashcard" or "the reading position".`},{key:`project_name`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`The name of the project the row belongs to, when it belongs to one that was known when the conflict was recorded.`},{key:`media_file_name`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`The name of the media file the row belongs to, when it belongs to one that was known when the conflict was recorded.`},{key:`kept`,value:{name:`union`,raw:`"this_device" | "other_device" | "deletion"`,elements:[{name:`literal`,value:`"this_device"`},{name:`literal`,value:`"other_device"`},{name:`literal`,value:`"deletion"`}],required:!0}},{key:`detected_at_ms`,value:{name:`number`,required:!0}}]}}],raw:`Array<SyncConflict>`,required:!0},description:`The 20 most recent conflicts, newest first.`},{key:`conflict_count`,value:{name:`number`,required:!0},description:`How many conflicts there are since they were last dismissed.`}]}},description:``},serverName:{required:!0,tsType:{name:`string`},description:``}}}})))()}export{s as n,i as t};