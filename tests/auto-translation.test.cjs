const test=require('node:test');
const assert=require('node:assert/strict');
const {database,invoke}=require('./helpers/d1.cjs');
const source={name:'Test',subtitle:'',abilities:[{title:'Shield',text:'Gain 2 shield.'}]};
test('translation endpoint: auth, validation, missing key, Google request mapping and provider failures',async()=>{
  const {DB,sqlite}=database();
  try {
    const {onRequestPost,translate}=await import('../functions/api/admin/translate.js');
    const body={source,sourceLanguage:'en',targets:['zh-TW','ja','ko']};
    for(const [token,status] of [[null,401],['user-session',403]]) assert.equal((await invoke(onRequestPost,DB,{method:'POST',body,token})).status,status);
    assert.equal((await invoke(onRequestPost,DB,{method:'POST',body,origin:'https://evil.test'})).status,403);
    assert.equal((await invoke(onRequestPost,DB,{method:'POST',body})).status,503);
    assert.equal((await invoke(onRequestPost,DB,{method:'POST',body:{...body,targets:['en']}})).status,400);
    const call=async (respond, input=body)=>translate({request:new Request('https://cards.test/api/admin/translate',{method:'POST',body:JSON.stringify(input)}),env:{GOOGLE_TRANSLATE_API_KEY:'test-secret'}},async(url,options)=>{
      assert.equal(url,'https://translation.googleapis.com/language/translate/v2');
      assert.equal(options.headers['X-Goog-Api-Key'],'test-secret');
      const payload=JSON.parse(options.body);
      assert.equal(payload.format,'text');assert.equal(payload.model,'nmt');assert.equal(payload.source,input.sourceLanguage);
      assert.ok(!payload.q.includes(''));assert.ok(options.signal instanceof AbortSignal);
      assert.ok(payload.q.join('').length<=5000);
      return respond(payload);
    });
    for(const [reason,code] of [['API_KEY_INVALID','translation-key-invalid'],['SERVICE_DISABLED','translation-api-disabled'],['BILLING_DISABLED','translation-billing'],['API_KEY_HTTP_REFERRER_BLOCKED','translation-key-restricted'],['QUOTA_EXCEEDED','translation-quota']]){
      const response=await call(()=>Response.json({error:{message:'private test-secret',details:[{reason}]}},{status:403}));
      assert.equal(response.status,424);assert.deepEqual(await response.json(),{ok:false,error:code});
    }
    const success=p=>Response.json({data:{translations:p.q.map(t=>({translatedText:t}))}});
    assert.deepEqual((await (await call(success)).json()).translations,Object.fromEntries(body.targets.map(l=>[l,source])));
    for(const status of [400,403,429,500]){
      const response=await call(()=>new Response('secret provider detail',{status}));assert.equal(response.status,424);assert.ok(!(await response.text()).includes('secret'));
    }
    assert.equal((await call(()=>new Response('not json'))).status,424);
    assert.equal((await call(p=>Response.json({data:{translations:p.q.map(t=>({translatedText:t.replace('2','99')}))}}))).status,424);
    assert.equal((await call(()=>Response.json({data:{translations:[]}}))).status,424);
    assert.equal((await call(()=>{throw new Error('network failed');})).status,424);
    const withSymbols={...body,source:{name:'A & B',subtitle:'A < B',abilities:[{title:'Shield',text:'Gain +2% {shield}.'}]}};
    assert.deepEqual((await (await call(success,withSymbols)).json()).translations.ja,withSymbols.source);
    assert.equal((await call(p=>Response.json({data:{translations:p.q.map(t=>({translatedText:t.replace('{shield}','shield')}))}}),withSymbols)).status,424);
    for(const sourceLanguage of ['zh-TW','ja','ko'])assert.equal((await call(success,{...body,sourceLanguage,targets:['en']})).status,200);
    const longSource={...source,subtitle:'Subtitle',abilities:Array.from({length:12},(_,i)=>({title:'Ability '+i,text:'Long description '.repeat(170)}))};
    assert.deepEqual((await (await call(success,{...body,source:longSource})).json()).translations.ko,longSource);
    for(const [original,translated,expected] of [
      ['造成三點傷害。','Deal 3 damage.',200],
      ['造成三點傷害。','Deal three damage.',200],
      ['抽一張牌。','Draw a card.',200],
      ['抽一張牌。','카드를 한 장 뽑습니다.',200],
      ['造成三點傷害，抽一張牌，恢復兩點生命。','피해를 3 입히고, 카드를 한 장 뽑고, 생명력을 2 회복합니다.',200],
      ['抽一張牌。','카드를 두 장 뽑습니다.',424],
      ['恢復兩點生命。','Restore 2 health.',200],
      ['造成十二點傷害。','Deal twelve damage.',200],
      ['造成二十一點傷害。','Deal twenty-one damage.',200],
      ['獲得＋３攻擊力。','Gain +3 attack.',200],
      ['造成三點傷害。','Deal 4 damage.',424],
      ['造成三點傷害。','Deal four damage.',424],
      ['造成三點傷害。','Deal damage.',424],
      ['一般攻擊。','Normal attack.',200],
      ['獨眼巨人。','One-eyed giant.',200],
      ['造成三點傷害兩次。','Deal 3 damage 2 times.',200],
      ['造成三點傷害兩次。','Deal 3 damage.',424]
    ]){
      const input={sourceLanguage:'zh-TW',source:{name:'Test',subtitle:'',abilities:[{title:'Skill',text:original}]},targets:['en']};
      const response=await call(p=>Response.json({data:{translations:p.q.map(t=>({translatedText:t===original?translated:t}))}}),input);
      assert.equal(response.status,expected,original+' -> '+translated);
    }
  }finally{sqlite.close();}
});
test('draft review, non-Chinese source, stale translation protection and metadata persistence',async()=>{
  const {DB,sqlite}=database();
  try {
    const cards=await import('../functions/api/admin/cards.js');
    const {fingerprint,translationState}=await import('../translation-workflow.js');
    const body={...source,id:'translated-card',sourceLanguage:'en',image:'cards-unified-31/01-murloc-chief.webp',collection:'Test',mana:1,attack:2,health:3,status:'draft',translations:{},translationMeta:{}};
    let result=await invoke(cards.onRequestPost,DB,{method:'POST',body});assert.equal(result.status,201);
    let saved=(await result.json()).item;
    assert.equal(saved.translations.en.name,source.name);
    assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body:{...saved,status:'active'}})).status,400);
    for(const l of ['zh-TW','ja','ko']){saved.translations[l]={...source,name:l};saved.translationMeta[l]={status:'machine',source:fingerprint(saved),sourceLanguage:'en'};}
    assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body:{...saved,status:'active'}})).status,400);
    for(const l of ['zh-TW','ja','ko'])saved.translationMeta[l].status='reviewed';
    result=await invoke(cards.onRequestPut,DB,{method:'PUT',body:{...saved,status:'active'}});assert.equal(result.status,200);saved=(await result.json()).item;
    assert.equal(saved.translations['zh-TW'].name,'zh-TW');
    const updated={...saved,name:'Updated source',status:'draft'};
    assert.equal(translationState(updated,'ja'),'stale');
    assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body:{...updated,status:'active'}})).status,400);
    result=await invoke(cards.onRequestPut,DB,{method:'PUT',body:updated});assert.equal(result.status,200);saved=(await result.json()).item;
    assert.equal(saved.translations.ja.name,'ja');assert.equal(translationState(saved,'ja'),'stale');
    assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body:{...saved,sourceLanguage:undefined}})).status,400);
    assert.equal((await invoke(cards.onRequestPut,DB,{method:'PUT',body:{...saved,translationMeta:{ja:{status:'invalid'}}}})).status,400);
  }finally{sqlite.close();}
});
