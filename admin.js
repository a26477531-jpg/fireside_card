import {languages, fingerprint, translationState} from './translation-workflow.js';
'use strict';
(() => {
  const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusNames={draft:'草稿',active:'已上架',archived:'已下架',pending:'處理中',completed:'已完成',cancelled:'已取消',refunded:'已退款'};
  const errors={'version-conflict':'資料已被其他管理員修改。請關閉視窗、重新載入後再編輯。','duplicate-id':'這個 ID 已存在，請換一個。','validation-failed':'資料格式不正確，請確認必填欄位、數值與翻譯格式。','invalid-product-card':'商品包含不存在或未上架的卡牌，請檢查選擇。','unauthenticated':'登入已過期，請重新登入。','forbidden':'此帳號沒有管理權限。'};
  let tab='cards', cards=[],products=[],editing=null,saving=false,page=1,orderQuery='',orderGeneration=0,translations={},translationLanguage='en';
  const form=$('edit-form'), field=name=>form.elements.namedItem(name);
  let translationMeta={},translating=false;
  Object.assign(errors,{'translation-unavailable':'尚未設定 Google 翻譯服務。可取消自動翻譯後儲存草稿。','translation-failed':'翻譯失敗或數值驗證未通過，原有內容已保留，請重試。','translation-review-required':'請先確認所有語言翻譯，再上架。'});
  async function api(url,options={}) {
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
    let data; try {data=await response.json();} catch {throw new Error('無法讀取後台資料。請確認 API 已部署且資料庫已初始化。');}
    if(!response.ok || !data.ok) {
      if(response.status===401 || response.status===403){$('workspace').hidden=true;$('access').hidden=false;$('access').textContent=errors[data.error]||'無法存取後台';}
      throw new Error(errors[data.error]||'讀取或儲存失敗，請稍後重試。');
    }
    return data;
  }
  const badge=s=>`<span class="status ${esc(s)}">${esc(statusNames[s]||s)}</span>`;
  function render() {
    const isCard=tab==='cards';
    $('list-title').textContent=isCard?'卡牌管理':'商品與金幣價格';
    $('list-help').textContent=isCard?'草稿可先保存，上架後才會顯示於卡牌庫。':'以整數金幣設定售價；修改會更新商城，不會改寫歷史訂單。';
    $('create').textContent=isCard?'＋ 建立卡牌':'＋ 建立商品';
    const q=$('search').value.trim().toLowerCase(),status=$('status').value;
    const rows=(isCard?cards:products).filter(r=>(!status||r.status===status)&&`${r.id} ${r.name}`.toLowerCase().includes(q));
    $('count').textContent=`顯示 ${rows.length} 筆，共 ${(isCard?cards:products).length} 筆`;
    $('catalog-head').innerHTML=`<tr><th>${isCard?'卡牌':'商品'}</th><th>${isCard?'系列／數值':'內容／金幣售價'}</th><th>狀態</th><th>操作</th></tr>`;
    $('catalog-body').innerHTML=rows.map(r=>`<tr><td>${isCard?`<img src="${esc(r.image)}" alt="" loading="lazy">`:''}${esc(r.name)}<small>${esc(r.id)}</small></td><td>${isCard?`${esc(r.collection)}<small>法力 ${r.mana} · 攻擊 ${r.attack} · 生命 ${r.health}</small>`:`${r.coinPrice.toLocaleString()} 金幣<small>${r.cardIds.map(id=>esc(cards.find(c=>c.id===id)?.name||id)).join('、')}</small>`}</td><td>${badge(r.status)}</td><td><button data-edit="${esc(r.id)}">編輯</button></td></tr>`).join('');
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
    row.innerHTML=`<label>技能名稱 *<input data-title required maxlength="120" value="${esc(a.title)}"></label><label>技能效果 *<textarea data-text required maxlength="3000" rows="3">${esc(a.text)}</textarea></label><button type="button">移除技能</button>`;
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
    const names={missing:'尚無翻譯',machine:'自動翻譯・待人工確認',edited:'人工修改・待確認',reviewed:'已人工確認',stale:'原文已更新・翻譯待確認'};
    const card={...sourceContent(),sourceLanguage:$('source-language').value,translations,translationMeta};
    $('translation-status').textContent=languages.filter(l=>l!==card.sourceLanguage).map(l=>`${l}：${names[translationState(card,l)]}`).join(' ／ ');
  }
  async function generateTranslations(current=false) {
    saveTranslation();
    const source=sourceContent(),sourceLanguage=$('source-language').value;
    if(!source.name || source.abilities.some(a=>!a.title||!a.text))throw new Error('請先填寫原文名稱及完整技能。');
    const targets=current?[translationLanguage]:languages.filter(l=>l!==sourceLanguage&&!translations[l]);
    if(!targets.length)return;
    if(current && translations[translationLanguage] && !window.confirm('重新翻譯會取代此語言的現有內容（包含人工修改），確定繼續？'))return;
    translating=true;
    const controls=[...form.querySelectorAll('input,textarea,select,button')],disabled=controls.map(el=>el.disabled);
    controls.forEach(el=>el.disabled=true);$('translation-status').textContent='正在翻譯，請稍候…';
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
    $('editor-title').textContent=`${editing?'編輯':'建立'}${isCard?'卡牌':'商品'}`;
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
      $('product-cards').innerHTML=cards.map(c=>`<label><input type="checkbox" value="${esc(c.id)}" ${editing?.cardIds.includes(c.id)?'checked':''}>${esc(c.name)} (${esc(statusNames[c.status])})</label>`).join('');
    }
    $('editor').showModal();field(editing?'name':'id').focus();
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving||translating)return;
    let body={id:field('id').value.trim(),name:field('name').value.trim(),status:field('status').value,version:editing?.version};
    if(tab==='cards') {
      for(const key of ['subtitle','image','collection'])body[key]=field(key).value.trim();
      for(const key of ['mana','attack','health'])body[key]=Number(field(key).value);
      body.abilities=[...$('abilities').children].map(r=>({title:r.querySelector('[data-title]').value.trim(),text:r.querySelector('[data-text]').value.trim()}));
      saveTranslation();
      if($('auto-translate').checked){try{await generateTranslations();}catch(e){$('form-error').textContent=e.message;return;}}
      body.translations=translations;body.translationMeta=translationMeta;body.sourceLanguage=$('source-language').value;
      if(body.status==='active' && languages.some(l=>l!==body.sourceLanguage && translationState(body,l)!=='reviewed')){$('form-error').textContent='請先將卡牌存為草稿，確認所有語言翻譯後再上架。';$('translation-panel').open=true;return;}
      for(const key of ['nameLayout','rulesLayout'])if(editing?.[key])body[key]=editing[key];
    } else {body.coinPrice=Number(field('coinPrice').value);body.cardIds=[...$('product-cards').querySelectorAll('input:checked')].map(i=>i.value);if(!body.cardIds.length){$('form-error').textContent='請至少選一張卡牌。';return;}}
    saving=true;$('save').disabled=true;$('save').textContent='儲存中…';$('form-error').textContent='';
    try{const result=await api('/api/admin/'+tab,{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const items=tab==='cards'?cards:products;const i=items.findIndex(r=>r.id===result.item.id);if(i>=0)items[i]=result.item;else items.unshift(result.item);render();$('editor').close();$('notice').textContent='已儲存，前台重新整理後會載入最新資料。';}
    catch(e){$('form-error').textContent=e.message;}
    finally{saving=false;$('save').disabled=false;$('save').textContent='儲存';}
  });
  async function orders() {
    const generation=++orderGeneration;$('orders-body').replaceChildren();$('orders-empty').hidden=true;$('order-summary').textContent='查詢中…';$('prev').disabled=$('next').disabled=true;
    try{const data=await api('/api/admin/orders?'+orderQuery+'&page='+page);if(generation!==orderGeneration)return;
      $('orders-body').innerHTML=data.orders.map(o=>`<tr><td><strong>${esc(o.order_number || o.id)}</strong><small>${esc(o.created_at)}</small><details class="order-reference"><summary>完整識別碼</summary><small>${esc(o.id)}</small></details></td><td>${esc(o.player_username)}<small>ID ${esc(o.user_id??'已刪除')} · ${esc(o.player_email)}</small></td><td>${esc(o.product_name)}<small>${esc(o.product_id)}</small></td><td>${o.quantity}</td><td>${o.total.toLocaleString()} ${o.currency==='COIN'?'金幣':esc(o.currency)}<small>單價 ${o.unit_price.toLocaleString()}</small></td><td>${badge(o.status)}</td></tr>`).join('');
      $('orders-empty').hidden=data.orders.length>0;$('order-summary').textContent=`共 ${data.total} 筆交易`;$('page').textContent=`${page} / ${Math.max(1,Math.ceil(data.total/25))}`;$('prev').disabled=page<=1;$('next').disabled=page*25>=data.total;
    }catch(e){if(generation===orderGeneration){$('order-summary').textContent=e.message;$('page').textContent='';}}
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
  $('review-translation').onclick=()=>{saveTranslation();if(!translations[translationLanguage]){$('form-error').textContent='請先填寫翻譯。';return;}markTranslation('reviewed');updateTranslationStatus();};
  form.addEventListener('input',()=>{if(tab==='cards'){saveTranslation();updateTranslationStatus();}});
  $('abilities').addEventListener('click',()=>updateTranslationStatus());
  $('translated-abilities').addEventListener('click',()=>{saveTranslation();updateTranslationStatus();});
  $('translation-language').onchange=()=>{saveTranslation();translationLanguage=$('translation-language').value;showTranslation();};
  for(const id of ['close','cancel'])$(id).onclick=()=>{if(!saving&&!translating)$('editor').close();};
  $('editor').addEventListener('cancel',e=>{if(saving||translating)e.preventDefault();});
  $('order-search').onsubmit=e=>{e.preventDefault();page=1;orderQuery=new URLSearchParams(new FormData(e.target)).toString();orders();};
  $('prev').onclick=()=>{page--;orders();};$('next').onclick=()=>{page++;orders();};
  (async()=>{try{const {user}=await api('/api/me');if(!user){$('access').innerHTML='請先以管理員帳號<a href="login.html">登入</a>。';return;}if(user.role!=='admin'){$('access').textContent='此帳號沒有管理權限。';return;}$('admin-name').textContent=user.username;$('access').hidden=true;$('workspace').hidden=false;await reload();}catch(e){$('access').textContent=e.message;}})();
})();
