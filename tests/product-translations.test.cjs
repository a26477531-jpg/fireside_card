const test=require('node:test');
const assert=require('node:assert/strict');
const {database,invoke}=require('./helpers/d1.cjs');

test('product translation endpoint: product permission, name-only requests, failures and Google mapping',async()=>{
  const {DB,sqlite}=database();
  const {onRequestPost,translateProduct}=await import('../functions/api/admin/translate-product.js');
  const {ROLE_PERMISSIONS}=await import('../functions/_lib/permissions.js');
  const permissions=ROLE_PERMISSIONS.admin;
  const body={sourceLanguage:'zh-TW',source:{name:'自訂冒險組合',subtitle:'',abilities:[]},targets:['en','ja','ko']};
  try {
    for(const [token,status] of [[null,401],['user-session',403]])assert.equal((await invoke(onRequestPost,DB,{method:'POST',body,token})).status,status);
    ROLE_PERMISSIONS.admin=['product.edit'];
    assert.equal((await invoke(onRequestPost,DB,{method:'POST',body})).status,503);
    ROLE_PERMISSIONS.admin=['card.edit'];
    assert.equal((await invoke(onRequestPost,DB,{method:'POST',body})).status,403);
    ROLE_PERMISSIONS.admin=permissions;
    assert.equal((await invoke(onRequestPost,DB,{method:'POST',body,origin:'https://evil.test'})).status,403);
    assert.equal((await invoke(onRequestPost,DB,{method:'POST',body:{...body,source:{...body.source,subtitle:'Not a product name'}}})).status,400);
    let calls=0;
    const context={request:new Request('https://cards.test/api/admin/translate-product',{method:'POST',body:JSON.stringify(body)}),env:{GOOGLE_TRANSLATE_API_KEY:'private-key'}};
    const result=await translateProduct(context,async(url,options)=>{
      calls++;const payload=JSON.parse(options.body);
      assert.deepEqual(payload.q,['自訂冒險組合']);assert.equal(payload.source,'zh-TW');assert.ok(body.targets.includes(payload.target));
      return Response.json({data:{translations:[{translatedText:payload.target+' adventure pack'}]}});
    });
    assert.equal(calls,3);
    assert.deepEqual((await result.json()).translations.en,{name:'en adventure pack',subtitle:'',abilities:[]});
    const failure=await translateProduct({...context,request:new Request(context.request.url,{method:'POST',body:JSON.stringify(body)})},async()=>Response.json({error:{message:'private-key'}},{status:503}));
    assert.equal(failure.status,424);assert.ok(!(await failure.text()).includes('private-key'));
  } finally {ROLE_PERMISSIONS.admin=permissions;sqlite.close();}
});

test('product review workflow persists translations, guards publication, preserves legacy and public catalog',async()=>{
  const {DB,sqlite}=database();
  const api=await import('../functions/api/admin/products.js');
  const {onRequestGet}=await import('../functions/api/catalog.js');
  const {fingerprint}=await import('../translation-workflow.js');
  const save=async(body,method='PUT')=>invoke(method==='POST'?api.onRequestPost:api.onRequestPut,DB,{method,body});
  try {
    const base={id:'translated-pack',name:'冒險組合',cardIds:['25'],coinPrice:35,status:'draft',sourceLanguage:'zh-TW'};
    assert.equal((await save({...base,status:'active'},'POST')).status,400);
    const {sourceLanguage,...noLocale}=base;
    assert.equal((await save({...noLocale,status:'active'},'POST')).status,400);
    const created=await save(base,'POST');assert.equal(created.status,201);
    let item=(await created.json()).item;
    const values=Object.fromEntries(['en','ja','ko'].map(lang=>[lang,{name:lang+' adventure pack',subtitle:'',abilities:[]}]));
    const meta=status=>Object.fromEntries(['en','ja','ko'].map(lang=>[lang,{status,source:fingerprint(item),sourceLanguage:'zh-TW'}]));
    item={...item,translations:values,translationMeta:meta('machine')};
    assert.equal((await save({...item,status:'active'})).status,400);
    const draft=await save(item);assert.equal(draft.status,200);item=(await draft.json()).item;
    assert.ok(!(await (await onRequestGet({env:{DB}})).json()).products.some(p=>p.id===item.id));
    item.translations.en.name='Manually reviewed pack';item.translationMeta=meta('reviewed');
    const published=await save({...item,status:'active'});assert.equal(published.status,200);item=(await published.json()).item;
    const publicProduct=(await (await onRequestGet({env:{DB}})).json()).products.find(p=>p.id===item.id);
    assert.equal(publicProduct.translations.en.name,'Manually reviewed pack');assert.equal(publicProduct.translationMeta,undefined);
    assert.equal((await save({...item,name:'更名組合'})).status,400);
    assert.equal((await save({...item,sourceLanguage:'en'})).status,400);
    assert.equal((await save({...item,translations:{en:{name:'bad',subtitle:'extra',abilities:[]}}})).status,400);
    // A price-only legacy client cannot erase or bypass translation review.
    const partial={id:item.id,name:item.name,cardIds:item.cardIds,coinPrice:50,status:'active',version:item.version};
    assert.equal((await save({...partial,name:'更名組合'})).status,400);
    const priceUpdate=await save(partial);assert.equal(priceUpdate.status,200);item=(await priceUpdate.json()).item;
    assert.equal(item.translations.en.name,'Manually reviewed pack');
    const legacy=JSON.parse(sqlite.prepare("SELECT data FROM catalog_products WHERE id='deepsea-duo'").get().data);
    assert.equal((await save({...legacy,id:'deepsea-duo',version:1,status:'active',coinPrice:40})).status,200);
    const changed=await save({...item,name:'更名組合',status:'draft'});assert.equal(changed.status,200);
    item=(await changed.json()).item;assert.equal((await save({...item,status:'active'})).status,400);
    assert.equal(item.translations.en.name,'Manually reviewed pack');
  }finally{sqlite.close();}
});
