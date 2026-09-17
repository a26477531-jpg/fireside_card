const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {parseCSV,compile}=require('../scripts/build-translations.cjs');
const context={window:{},document:{documentElement:{}},localStorage:{getItem(){return 'invalid';},setItem(){}}};
for(const file of ['cards-data.js','translations-data.js','i18n.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const cards=context.window.CARDS;
const csv=fs.readFileSync(path.join(root,'data/card-translations.csv'),'utf8');
test('CSV supports BOM, commas, escaped quotes and multiline cells',()=>{
  assert.deepEqual(parseCSV('\ufeffid,text\r\n01,"A, B ""quoted""\nnext line"\r\n'),[['id','text'],['01','A, B "quoted"\nnext line']]);
  assert.throws(()=>parseCSV('id,text\n01,"unclosed'),/引號/);
});
test('124 complete translations round-trip into the shipped JS file',()=>{
  const output=compile(csv,cards);
  assert.equal(Object.keys(output).length,31);
  assert.equal(Object.values(output).reduce((n,v)=>n+Object.keys(v).length,0),124);
  assert.equal(JSON.stringify(output),JSON.stringify(context.window.CARD_TRANSLATIONS));
  for(const card of cards)for(const lang of ['zh-TW','en','ja','ko'])assert.equal(output[card.id][lang].abilities.length,card.abilities.length);
});
test('duplicate keys, unknown locales, incomplete rows are rejected',()=>{
  const row=csv.split('\r\n')[1];
  assert.throws(()=>compile(csv+row+'\r\n',cards),/重複/);
  assert.throws(()=>compile(csv.replace('"en"','"fr"'),cards),/未知/);
  assert.throws(()=>compile(csv.replace('"Murloc Chief"','""'),cards),/不完整/);
});
test('CSV edits take effect without changing common stats or other translations',()=>{
  const edited=compile(csv.replace('"Murloc Chief"','"Reef Commander"'),cards);
  assert.equal(edited['01'].en.name,'Reef Commander');
  assert.equal(edited['01']['zh-TW'].name,cards[0].name);
  assert.equal(cards[0].mana,5);
});
test('language lookup preserves stats and layout, defaults safely, and falls back to Chinese',()=>{
  const i18n=context.window.CardI18n;
  assert.equal(i18n.language,'zh-TW');
  i18n.setLanguage('ko');assert.equal(i18n.card(cards[0]).name,'멀록 족장');
  assert.equal(i18n.card(cards[0]).image,cards[0].image);
  assert.equal(i18n.card(cards[0]).nameLayout,cards[0].nameLayout);
  i18n.setLanguage('bad');assert.equal(i18n.language,'ko');
  const saved=context.window.CARD_TRANSLATIONS['01'].ko;
  delete context.window.CARD_TRANSLATIONS['01'].ko;
  assert.equal(i18n.card(cards[0]).name,'魚人酋長');
  context.window.CARD_TRANSLATIONS['01'].ko=saved;
});
test('filters use shared mechanics, names search in selected language',()=>{
  const fields=Object.fromEntries(Object.entries({search:'',set:'all',ability:'護盾',attack:'0',health:'0',sort:'mana-asc'}).map(([key,value])=>[key,{value}]));
  context.document.getElementById=id=>fields[id];
  const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
  vm.runInNewContext(source.slice(0,source.indexOf('function render()')),context);
  const totals=[];
  for(const lang of ['zh-TW','en','ja','ko']){context.window.CardI18n.setLanguage(lang);totals.push(vm.runInNewContext('filteredCards().length',context));}
  assert(totals.every(n=>n===11));
  fields.ability.value='all';context.window.CardI18n.setLanguage('ja');fields.search.value='マーロック';
  assert.equal(vm.runInNewContext('filteredCards().length',context),2);
});
