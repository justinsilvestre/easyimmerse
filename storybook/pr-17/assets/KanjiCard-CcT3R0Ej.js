import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{t}from"./jsx-runtime-DeHZSEgm.js";import{n,t as r}from"./ClickableText-CDi9RsO8.js";import{C as i,S as a,b as o,g as s,i as c,r as l,v as u,x as d}from"./exampleTermEntry-B3N_sdoa.js";function f({result:e,onWordClick:t}){let{entry:n,tags:i}=e,o=d();return(0,h.jsxs)(`article`,{"aria-label":`Kanji ${n.character}`,className:`flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0`,children:[(0,h.jsx)(`span`,{lang:`ja`,className:`text-5xl leading-none`,children:n.character}),(0,h.jsxs)(`div`,{className:`flex min-w-0 flex-1 flex-col gap-1.5 text-sm`,children:[(0,h.jsx)(l,{tags:s(n.tags,i)}),(0,h.jsx)(p,{label:`On`,readings:n.onyomi}),(0,h.jsx)(p,{label:`Kun`,readings:n.kunyomi}),(0,h.jsx)(`p`,{children:(0,h.jsx)(r,{text:n.meanings.join(`, `),gestures:u(t,o)})}),(0,h.jsx)(a,{frequencies:e.frequencies}),(0,h.jsx)(m,{result:e}),(0,h.jsx)(`span`,{className:`text-xs text-fg-faint`,children:e.dictionaryTitle})]})]})}function p({label:e,readings:t}){return t.length===0?null:(0,h.jsxs)(`p`,{lang:`ja`,children:[(0,h.jsx)(`span`,{className:`mr-2 text-xs text-fg-faint`,children:e}),t.map((e,t)=>{let[n,r]=e.split(`.`);return(0,h.jsxs)(`span`,{children:[t>0&&`、`,n,r&&(0,h.jsx)(`span`,{className:`text-fg-faint`,children:r})]},e)})]})}function m({result:{entry:e,tags:t}}){let n=s(Object.keys(e.stats),t);return n.length===0?null:(0,h.jsx)(`dl`,{className:`grid grid-cols-[auto_1fr] gap-x-3 text-xs`,children:n.map(t=>(0,h.jsxs)(`div`,{className:`contents`,children:[(0,h.jsx)(`dt`,{className:`text-fg-muted`,children:t.notes||t.name}),(0,h.jsx)(`dd`,{children:e.stats[t.name]})]},t.name))})}var h;function g(){return(g=e((()=>{n(),i(),o(),c(),h=t(),f.__docgenInfo={description:`One kanji in the dictionary pop-up: the character, its readings and meanings, and facts such as stroke count labelled by the dictionary's tags.`,methods:[],displayName:`KanjiCard`,props:{result:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{ dictionaryId: string, dictionaryTitle: string, entry: KanjiEntry, tags: Array<TagDefinition>, frequencies: Array<DictionaryFrequency>, }`,signature:{properties:[{key:`dictionaryId`,value:{name:`string`,required:!0}},{key:`dictionaryTitle`,value:{name:`string`,required:!0}},{key:`entry`,value:{name:`signature`,type:`object`,raw:`{ character: string, 
/**
 * Readings borrowed from Chinese, written in katakana.
 */
onyomi: Array<string>, 
/**
 * Native Japanese readings, written in hiragana.
 */
kunyomi: Array<string>, tags: Array<string>, meanings: Array<string>, 
/**
 * Facts such as stroke count or grade, keyed by the name of the tag that labels them.
 */
stats: { [key in string]: string }, }`,signature:{properties:[{key:`character`,value:{name:`string`,required:!0}},{key:`onyomi`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Readings borrowed from Chinese, written in katakana.`},{key:`kunyomi`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0},description:`Native Japanese readings, written in hiragana.`},{key:`tags`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0}},{key:`meanings`,value:{name:`Array`,elements:[{name:`string`}],raw:`Array<string>`,required:!0}},{key:`stats`,value:{name:`signature`,type:`object`,raw:`{ [key in string]: string }`,signature:{properties:[{key:{name:`string`,required:!0},value:{name:`string`}}]},required:!0},description:`Facts such as stroke count or grade, keyed by the name of the tag that labels them.`}]},required:!0}},{key:`tags`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ name: string, 
/**
 * A grouping such as \`partOfSpeech\` or \`frequent\`, which display uses to color the tag.
 */
category: string, 
/**
 * The position of the tag among others; lower comes first.
 */
order: number, 
/**
 * A longer description of the tag.
 */
notes: string, score: number, }`,signature:{properties:[{key:`name`,value:{name:`string`,required:!0}},{key:`category`,value:{name:`string`,required:!0},description:"A grouping such as `partOfSpeech` or `frequent`, which display uses to color the tag."},{key:`order`,value:{name:`number`,required:!0},description:`The position of the tag among others; lower comes first.`},{key:`notes`,value:{name:`string`,required:!0},description:`A longer description of the tag.`},{key:`score`,value:{name:`number`,required:!0}}]}}],raw:`Array<TagDefinition>`,required:!0}},{key:`frequencies`,value:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{ dictionaryId: string, dictionaryTitle: string, reading: string | null, frequency: Frequency, }`,signature:{properties:[{key:`dictionaryId`,value:{name:`string`,required:!0}},{key:`dictionaryTitle`,value:{name:`string`,required:!0}},{key:`reading`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0}},{key:`frequency`,value:{name:`signature`,type:`object`,raw:`{ 
/**
 * The number to sort by, if the dictionary gives one.
 */
value: number | null, 
/**
 * The text to show in place of the value, if the dictionary gives one.
 */
display: string | null, }`,signature:{properties:[{key:`value`,value:{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}],required:!0},description:`The number to sort by, if the dictionary gives one.`},{key:`display`,value:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}],required:!0},description:`The text to show in place of the value, if the dictionary gives one.`}]},required:!0}}]}}],raw:`Array<DictionaryFrequency>`,required:!0}}]}},description:``},onWordClick:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(word: string) => void`,signature:{arguments:[{type:{name:`string`},name:`word`}],return:{name:`void`}}},description:``}}}})))()}export{g as n,f as t};