import {t, getLanguage, setLanguage, applyLanguage, cardName, collectionName, bundleName} from './admin-i18n.js';
import {languages, fingerprint, translationState} from './translation-workflow.js';
'use strict';
(() => {
  const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusNames={draft:'草稿',active:'已上架',archived:'已下架',pending:'處理中',completed:'已完成',cancelled:'已取消',refunded:'已退款'};
  const errors={'version-conflict':'資料已被其他管理員修改。請關閉視窗、重新載入後再編輯。','duplicate-id':'這個 ID 已存在，請換一個。','validation-failed':'資料格式不正確，請確認必填欄位、數值與翻譯格式。','invalid-product-card':'商品包含不存在或未上架的卡牌，請檢查選擇。','unauthenticated':'登入已過期，請重新登入。','forbidden':'此帳號沒有管理權限。'};
  let tab='cards', cards=[],products=[],editing=null,saving=false,page=1,orderQuery='',orderGeneration=0,translations={},translationLanguage='en';
  const form=$('edit-form'), field=name=>form.elements.namedItem(name);
  let translationMeta={},translating=false;
  let savedEditorState='';
  function editorState(){
    if(tab==='cards')saveTranslation();
    const values=[...form.querySelectorAll('input,textarea,select')]
      .filter(el=>!el.closest('#translation-panel') && !el.closest(tab==='cards'?'#product-fields':'#card-fields'))
      .map(el=>[el.name||el.id||el.dataset.title||el.dataset.text||'',el.type==='checkbox'?el.checked:el.value]);
    const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
    const unfinished=tab==='cards'&&!field('translatedName').value.trim()?[field('translatedSubtitle').value,[...$('translated-abilities').querySelectorAll('input,textarea')].map(el=>el.value)]:['',[]];
    return JSON.stringify(ordered({values,translations:tab==='cards'?translations:null,meta:tab==='cards'?translationMeta:null,unfinished}));
  }
  const hasUnsavedChanges=()=>$('editor').open && editorState()!==savedEditorState;
  function requestEditorClose(){
    if(saving||translating)return;
    if(hasUnsavedChanges()){$('unsaved-warning').hidden=false;$('keep-editing').focus();return;}
    $('editor').close();
  }
  Object.assign(errors,{'translation-unavailable':'尚未設定 Google 翻譯服務。可取消自動翻譯後儲存草稿。','translation-failed':'翻譯失敗或數值驗證未通過，原有內容已保留，請重試。','translation-review-required':'請先確認所有語言翻譯，再上架。'});
  Object.assign(errors,{
    'translation-key-invalid':'Google 不接受目前的 API 金鑰，請確認金鑰有效且貼上完整。',
    'translation-api-disabled':'此金鑰所屬的 Google 專案尚未啟用 Cloud Translation API。',
    'translation-billing':'Google 要求先為金鑰所屬專案啟用帳單（可使用有效試用帳戶）。',
    'translation-key-restricted':'Google 金鑰限制阻擋了翻譯請求，請確認允許 Cloud Translation API，且未設定瀏覽器來源限制。',
    'translation-quota':'Google 翻譯配額已達上限，請檢查 Google Cloud 配額後再試。',
    'translation-access-denied':'Google 拒絕存取，請檢查金鑰權限、Translation API 啟用與帳單狀態。',
    'translation-provider-error':'翻譯失敗：Google 服務回傳錯誤，請稍後再試。',
    'translation-network':'翻譯伺服器無法連線到 Google，請稍後再試。',
    'translation-timeout':'Google 翻譯逾時，原文已保留，請稍後再試。'
  });
  async function api(url,options={}) {
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
    let data; try {data=await response.json();} catch {
      const error=new Error(t('伺服器回應格式異常（HTTP {status}，{url}）。請提供此訊息以便查詢；已填內容仍保留。',{status:response.status,url:url.split('?')[0]}));
      error.code=url==='/api/admin/translate'?'translation-failed':'invalid-response';throw error;
    }
    if(!response.ok || !data.ok) {
      if(response.status===401 || response.status===403){$('workspace').hidden=true;$('access').hidden=false;$('access').textContent=t(errors[data.error]||'')||t('無法存取後台');}
      const error=new Error(t(errors[data.error]||'')||t('讀取或儲存失敗，請稍後重試。'));error.code=data.error;throw error;
    }
    return data;
  }
  const badge=s=>`<span class="status ${esc(s)}">${esc(t(statusNames[s]||s))}</span>`;
  function render() {
    const isCard=tab==='cards';
    $('list-title').textContent=isCard?t('卡牌管理'):t('商品與金幣價格');
    $('list-help').textContent=isCard?t('草稿可先保存，上架後才會顯示於卡牌庫。'):t('以整數金幣設定售價；修改會更新商城，不會改寫歷史訂單。');
    $('create').textContent=isCard?t('＋ 建立卡牌'):t('＋ 建立商品');
    const q=$('search').value.trim().toLowerCase(),status=$('status').value;
    const rows=(isCard?cards:products).filter(r=>(!status||r.status===status)&&[r.id,r.name,...(isCard?Object.values(r.translations||{}).map(v=>v.name):[bundleName(r.name,'en')])].join(' ').toLowerCase().includes(q));
    $('count').textContent=t('顯示 {shown} 筆，共 {total} 筆',{shown:rows.length,total:(isCard?cards:products).length});
    $('catalog-head').innerHTML=`<tr><th>${isCard?t('卡牌'):t('商品')}</th><th>${isCard?t('系列／數值'):t('內容／金幣售價')}</th><th>${t('狀態')}</th><th>${t('操作')}</th></tr>`;
    $('catalog-body').innerHTML=rows.map(r=>`<tr><td>${isCard?`<img src="${esc(r.image)}" alt="" loading="lazy">`:''}${esc(isCard?cardName(r):bundleName(r.name))}<small>${esc(r.id)}</small></td><td>${isCard?`${esc(collectionName(r.collection))}<small>${t('法力')} ${r.mana} · ${t('攻擊')} ${r.attack} · ${t('生命')} ${r.health}</small>`:`${r.coinPrice.toLocaleString()} ${t('金幣')}<small>${r.cardIds.map(id=>esc(cardName(cards.find(c=>c.id===id))||id)).join(getLanguage()==='en'?', ':'、')}</small>`}</td><td>${badge(r.status)}</td><td><button data-edit="${esc(r.id)}">${t('編輯')}</button></td></tr>`).join('');
    $('catalog-empty').hidden=rows.length>0;
  }
  async function reload() {
    $('reload').disabled=true;
    try {const [c,p]=await Promise.all([api('/api/admin/cards'),api('/api/admin/products')]);cards=c.items;products=p.items;render();$('notice').textContent='';}
    catch(e){$('notice').textContent=e.message;}
    finally{$('reload').disabled=false;}
  }
  function addAbility(a={title:'',text:''},host=$('abilities')) {
    if(host.children.length>=12)return;
    const row=document.createElement('div');row.className='ability';
    row.innerHTML=`<label><span data-i18n="技能名稱 *">${t('技能名稱 *')}</span><input data-title required maxlength="120" value="${esc(a.title)}"></label><label><span data-i18n="技能效果 *">${t('技能效果 *')}</span><textarea data-text required maxlength="3000" rows="3">${esc(a.text)}</textarea></label><button type="button"><span data-i18n="移除技能">${t('移除技能')}</span></button>`;
    row.querySelector('button').onclick=()=>row.remove();host.append(row);
  }
  function saveTranslation() {
    const name=field('translatedName').value.trim();
    if(!name){delete translations[translationLanguage];delete translationMeta[translationLanguage];return;}
    const previous=translations[translationLanguage];
    translations[translationLanguage]={name,subtitle:field('translatedSubtitle').value.trim(),abilities:[...$('translated-abilities').children].map(r=>({title:r.querySelector('[data-title]').value.trim(),text:r.querySelector('[data-text]').value.trim()}))};
    if(JSON.stringify(previous)!==JSON.stringify(translations[translationLanguage]))markTranslation('edited');
  }
  function sourceContent() {
    return {name:field('name').value.trim(),subtitle:field('subtitle').value.trim(),abilities:[...$('abilities').children].map(r=>({title:r.querySelector('[data-title]').value.trim(),text:r.querySelector('[data-text]').value.trim()}))};
  }
  function markTranslation(status) {translationMeta[translationLanguage]={status,source:fingerprint(sourceContent()),sourceLanguage:$('source-language').value};}
  function updateTranslationStatus() {
    const names={missing:t('尚無翻譯'),machine:t('自動翻譯・待人工確認'),edited:t('人工修改・待確認'),reviewed:t('已人工確認'),stale:t('原文已更新・翻譯待確認')};
    const card={...sourceContent(),sourceLanguage:$('source-language').value,translations,translationMeta};
    $('translation-status').textContent=languages.filter(l=>l!==card.sourceLanguage).map(l=>`${l}：${names[translationState(card,l)]}`).join(' ／ ');
  }
  async function generateTranslations(current=false) {
    saveTranslation();
    const source=sourceContent(),sourceLanguage=$('source-language').value;
    if(!source.name || source.abilities.some(a=>!a.title||!a.text))throw new Error(t('請先填寫原文名稱及完整技能。'));
    const targets=current?[translationLanguage]:languages.filter(l=>l!==sourceLanguage&&!translations[l]);
    if(!targets.length)return;
    if(current && translations[translationLanguage] && !window.confirm(t('重新翻譯會取代此語言的現有內容（包含人工修改），確定繼續？')))return;
    translating=true;
    const controls=[...form.querySelectorAll('input,textarea,select,button')],disabled=controls.map(el=>el.disabled);
    controls.forEach(el=>el.disabled=true);$('translation-status').textContent=t('正在翻譯，請稍候…');
    try {
      const result=await api('/api/admin/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,sourceLanguage,targets}),signal:AbortSignal.timeout(60000)});
      for(const lang of targets){translations[lang]=result.translations[lang];translationMeta[lang]={status:'machine',source:fingerprint(source),sourceLanguage};}
      showTranslation();
    }finally{controls.forEach((el,i)=>el.disabled=disabled[i]);translating=false;updateTranslationStatus();}
  }
  function showTranslation() {
    const value=translations[translationLanguage];field('translatedName').value=value?.name||'';field('translatedSubtitle').value=value?.subtitle||'';
    $('translated-abilities').replaceChildren();for(const a of value?.abilities||[])addAbility(a,$('translated-abilities'));updateTranslationStatus();
  }
  function edit(id) {
    const isCard=tab==='cards';editing=id?(isCard?cards:products).find(r=>r.id===id):null;
    form.reset();$('form-error').textContent='';$('abilities').replaceChildren();$('translated-abilities').replaceChildren();
    $('editor-title').textContent=t(isCard?(editing?'編輯卡牌':'建立卡牌'):(editing?'編輯商品':'建立商品'));
    $('card-fields').hidden=!isCard;$('product-fields').hidden=isCard;
    // Disabled hidden fields must not participate in native required validation.
    for(const el of $('card-fields').querySelectorAll('input,textarea,button,select'))el.disabled=!isCard;
    for(const el of $('product-fields').querySelectorAll('input'))el.disabled=isCard;
    const defaults={id:'',name:'',status:'draft',subtitle:'',collection:'',image:'',mana:0,attack:0,health:0,coinPrice:30};
    for(const [key,value] of Object.entries(defaults))field(key).value=editing?.[key]??value;
    field('id').readOnly=Boolean(editing);
    for(const key of ['collection','image','mana','attack','health'])field(key).required=isCard;
    field('coinPrice').required=!isCard;
    if(isCard){
      for(const a of editing?.abilities||[])addAbility(a);
      translations=structuredClone(editing?.translations||{});translationMeta=structuredClone(editing?.translationMeta||{});
      $('source-language').value=editing?.sourceLanguage||'zh-TW';$('source-language').disabled=Boolean(editing);
      const sourceLanguage=$('source-language').value;delete translations[sourceLanguage];
      for(const lang of Object.keys(translations))if(!translationMeta[lang])translationMeta[lang]={status:'reviewed',source:fingerprint(sourceContent()),sourceLanguage};
      for(const option of $('translation-language').options)option.disabled=option.value===sourceLanguage;
      translationLanguage=languages.find(l=>l!==sourceLanguage);$('translation-language').value=translationLanguage;$('auto-translate').checked=!editing;$('translation-panel').open=false;showTranslation();
      $('collection-options').innerHTML=[...new Set(cards.map(c=>c.collection))].map(v=>`<option value="${esc(v)}"></option>`).join('');
    } else {
      $('product-cards').innerHTML=cards.map(c=>`<label><input type="checkbox" value="${esc(c.id)}" ${editing?.cardIds.includes(c.id)?'checked':''}><span data-card-name="${esc(c.id)}">${esc(cardName(c))}</span> (<span data-product-status="${esc(c.status)}">${esc(t(statusNames[c.status]))}</span>)</label>`).join('');
    }
    $('unsaved-warning').hidden=true;savedEditorState=editorState();
    $('editor').showModal();field(editing?'name':'id').focus();
  }
  form.addEventListener('invalid',event=>{
    const input=event.target;
    const details=input.closest('details');if(details)details.open=true;
    const label=input.closest('label')?.childNodes[0]?.textContent?.trim()||t('必填欄位');
    $('form-error').textContent=t('無法儲存：請檢查「{label}」。{message}',{label,message:input.validationMessage});
  },true);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving||translating)return;
    let translationWarning='';
    let body={id:field('id').value.trim(),name:field('name').value.trim(),status:field('status').value,version:editing?.version};
    if(tab==='cards') {
      for(const key of ['subtitle','image','collection'])body[key]=field(key).value.trim();
      for(const key of ['mana','attack','health'])body[key]=Number(field(key).value);
      body.abilities=[...$('abilities').children].map(r=>({title:r.querySelector('[data-title]').value.trim(),text:r.querySelector('[data-text]').value.trim()}));
      saveTranslation();
      if($('auto-translate').checked){try{await generateTranslations();}catch(e){
        const canSaveDraft=body.status==='draft' && (e.code?.startsWith('translation-')||['TypeError','TimeoutError','AbortError'].includes(e.name));
        if(!canSaveDraft){$('form-error').textContent=e.message;return;}
        translationWarning=t('已儲存草稿；自動翻譯未完成，原文與既有譯文已保留。請稍後編輯此卡牌，按「自動補齊翻譯」。');
      }}
      body.translations=translations;body.translationMeta=translationMeta;body.sourceLanguage=$('source-language').value;
      if(body.status==='active' && languages.some(l=>l!==body.sourceLanguage && translationState(body,l)!=='reviewed')){$('form-error').textContent=t('請先將卡牌存為草稿，確認所有語言翻譯後再上架。');$('translation-panel').open=true;return;}
      for(const key of ['nameLayout','rulesLayout'])if(editing?.[key])body[key]=editing[key];
    } else {body.coinPrice=Number(field('coinPrice').value);body.cardIds=[...$('product-cards').querySelectorAll('input:checked')].map(i=>i.value);if(!body.cardIds.length){$('form-error').textContent=t('請至少選一張卡牌。');return;}}
    saving=true;$('save').disabled=true;$('save').textContent=t('儲存中…');$('form-error').textContent='';
    try{const result=await api('/api/admin/'+tab,{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const items=tab==='cards'?cards:products;const i=items.findIndex(r=>r.id===result.item.id);if(i>=0)items[i]=result.item;else items.unshift(result.item);render();$('editor').close();$('notice').textContent=translationWarning||t('已儲存，前台重新整理後會載入最新資料。');}
    catch(e){$('form-error').textContent=e.message;}
    finally{saving=false;$('save').disabled=false;$('save').textContent=t('儲存');}
  });
  async function orders() {
    lastOrders=null;const generation=++orderGeneration;$('orders-body').replaceChildren();$('orders-empty').hidden=true;$('order-summary').textContent=t('查詢中…');$('prev').disabled=$('next').disabled=true;
    try{const data=await api('/api/admin/orders?'+orderQuery+'&page='+page);if(generation!==orderGeneration)return;
      lastOrders=data;renderOrders(data);
    }catch(e){if(generation===orderGeneration){$('order-summary').textContent=e.message;$('page').textContent='';}}
  }
  let lastOrders=null;
  function renderOrders(data) {
      $('orders-body').innerHTML=data.orders.map(o=>`<tr><td><strong>${esc(o.order_number || o.id)}</strong><small>${esc(o.created_at)}</small><details class="order-reference"><summary>${t('完整識別碼')}</summary><small>${esc(o.id)}</small></details></td><td>${esc(o.player_username)}<small>ID ${esc(o.user_id??t('已刪除'))} · ${esc(o.player_email)}</small></td><td>${esc(bundleName(o.product_name))}<small>${esc(o.product_id)}</small></td><td>${o.quantity}</td><td>${o.total.toLocaleString()} ${o.currency==='COIN'?t('金幣'):esc(o.currency)}<small>${t('單價')} ${o.unit_price.toLocaleString()}</small></td><td>${badge(o.status)}</td></tr>`).join('');
      $('orders-empty').hidden=data.orders.length>0;$('order-summary').textContent=t('共 {total} 筆交易',{total:data.total});$('page').textContent=`${page} / ${Math.max(1,Math.ceil(data.total/25))}`;$('prev').disabled=page<=1;$('next').disabled=page*25>=data.total;
  }
  document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('catalog-panel').hidden=tab==='orders';$('orders-panel').hidden=tab!=='orders';$('notice').textContent='';if(tab==='orders')orders();else render();});
  $('search').oninput=render;$('status').onchange=render;$('reload').onclick=reload;$('create').onclick=()=>edit();
  $('catalog-body').onclick=e=>{const b=e.target.closest('[data-edit]');if(b)edit(b.dataset.edit);};
  $('add-ability').onclick=()=>addAbility();
  $('add-translated-ability').onclick=()=>addAbility(undefined,$('translated-abilities'));
  $('source-language').onchange=()=>{
    saveTranslation();const sourceLanguage=$('source-language').value;delete translations[sourceLanguage];delete translationMeta[sourceLanguage];
    for(const option of $('translation-language').options)option.disabled=option.value===sourceLanguage;
    translationLanguage=languages.find(l=>l!==sourceLanguage);$('translation-language').value=translationLanguage;showTranslation();
  };
  for(const [id,current] of [['translate-missing',false],['translate-current',true]])$(id).onclick=async()=>{if(translating||saving)return;$('form-error').textContent='';try{await generateTranslations(current);}catch(e){$('form-error').textContent=e.message;}};
  $('review-translation').onclick=()=>{saveTranslation();if(!translations[translationLanguage]){$('form-error').textContent=t('請先填寫翻譯。');return;}markTranslation('reviewed');updateTranslationStatus();};
  form.addEventListener('input',()=>{if(tab==='cards'){saveTranslation();updateTranslationStatus();}});
  $('abilities').addEventListener('click',()=>updateTranslationStatus());
  $('translated-abilities').addEventListener('click',()=>{saveTranslation();updateTranslationStatus();});
  $('translation-language').onchange=()=>{saveTranslation();translationLanguage=$('translation-language').value;showTranslation();};
  for(const id of ['close','cancel'])$(id).onclick=requestEditorClose;
  $('editor').addEventListener('cancel',e=>{e.preventDefault();requestEditorClose();});
  $('keep-editing').onclick=()=>{$('unsaved-warning').hidden=true;field('name').focus();};
  $('discard-editing').onclick=()=>{if(!saving&&!translating)$('editor').close();};
  window.addEventListener('beforeunload',event=>{
    if(saving||translating||hasUnsavedChanges()){event.preventDefault();event.returnValue='';}
  });
  $('order-search').onsubmit=e=>{e.preventDefault();page=1;orderQuery=new URLSearchParams(new FormData(e.target)).toString();orders();};
  $('prev').onclick=()=>{page--;orders();};$('next').onclick=()=>{page++;orders();};
  $('admin-language').value=getLanguage();applyLanguage();
  $('admin-language').onchange=()=>{
    setLanguage($('admin-language').value);
    if(tab==='orders'){if(lastOrders)renderOrders(lastOrders);}else render();
    if($('editor').open && tab==='cards' && !translating)updateTranslationStatus();
    document.querySelectorAll('[data-card-name]').forEach(el=>el.textContent=cardName(cards.find(c=>c.id===el.dataset.cardName))||el.dataset.cardName);
    document.querySelectorAll('[data-product-status]').forEach(el=>el.textContent=t(statusNames[el.dataset.productStatus]));
  };
  (async()=>{try{const {user}=await api('/api/me');if(!user){$('access').innerHTML=`<span data-i18n="請先以管理員帳號">${t('請先以管理員帳號')}</span><a href="login.html" data-i18n="登入">${t('登入')}</a><span data-i18n="。">${t('。')}</span>`;return;}if(user.role!=='admin'){$('access').textContent=t('此帳號沒有管理權限。');return;}$('admin-name').textContent=user.username;$('access').hidden=true;$('workspace').hidden=false;await reload();}catch(e){$('access').textContent=e.message;}})();
})();
