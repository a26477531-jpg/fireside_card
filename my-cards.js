'use strict';
(() => {
  const $=id=>document.getElementById(id),t=window.CardCommerce.t;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let rows=[],favorites=new Set(),favoritesReady=false,statusKey='',generation=0;
  function render(){
    document.title=t('myCards')+' | '+CardI18n.t('brand');$('owned-title').textContent=t('myCards');$('owned-intro').textContent=t('ownedIntro');
    $('owned-search').placeholder=t('search');$('owned-search').setAttribute('aria-label',t('search'));$('owned-retry').textContent=t('reload');$('owned-close').textContent=t('close');
    $('owned-status').textContent=statusKey?t(statusKey):'';
    $('owned-shop').textContent=CardI18n.t('shop');$('owned-login').textContent=CardI18n.t('login');$('owned-login').hidden=statusKey!=='loginOwned';
    const query=$('owned-search').value.trim().toLocaleLowerCase();
    $('owned-grid').innerHTML=rows.map(row=>({...row,card:CardI18n.card(row.card)})).filter(row=>row.card.name.toLocaleLowerCase().includes(query)).map(row=>{
      const card=row.card;
      return `<article class="owned-card"><button class="owned-open" data-card="${escape(card.id)}" aria-label="${escape(t('details')+' '+card.name)}">${artwork(card)}<h2>${escape(card.name)}</h2></button><p>${escape(t('owned'))}：${row.quantity}</p><button class="gold-button owned-favorite" data-card="${escape(card.id)}" aria-pressed="${favorites.has(card.id)}" ${favoritesReady?'':'disabled'}>${escape(t(favorites.has(card.id)?'unfavorite':'favorite'))}</button></article>`;
    }).join('');CardTextFit.schedule($('owned-grid'));
  }
  async function load(){
    const current=++generation;rows=[];favoritesReady=false;statusKey='';render();$('owned-retry').disabled=true;
    try{
      const response=await fetch('/api/my-cards',{credentials:'same-origin',cache:'no-store'});
      if(response.status===401){statusKey='loginOwned';return;}
      if(!response.ok)throw Error();
      const result=await response.json();if(current!==generation)return;rows=result.cards;statusKey=rows.length?'':'empty';
      try{const res=await fetch('/api/favorites',{credentials:'same-origin',cache:'no-store'});if(!res.ok)throw Error();const data=await res.json();if(current!==generation)return;favorites=new Set(data.cardIds);favoritesReady=true;}catch{statusKey='favoriteError';}
    }catch{if(current===generation)statusKey='loadError';}
    finally{if(current===generation){render();$('owned-retry').disabled=false;}}
  }
  $('owned-grid').addEventListener('click',async event=>{
    const button=event.target.closest('button[data-card]');if(!button)return;
    const id=button.dataset.card;
    if(button.classList.contains('owned-favorite')){
      const remove=favorites.has(id);button.disabled=true;
      try{const res=await fetch('/api/favorites',{method:remove?'DELETE':'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardId:id})});if(!res.ok)throw Error();remove?favorites.delete(id):favorites.add(id);statusKey='';}catch{statusKey='favoriteError';}finally{render();}return;
    }
    const card=CardI18n.card(rows.find(row=>row.card.id===id).card);
    $('owned-detail-content').innerHTML=`<h2 id="owned-detail-title">${escape(card.name)}</h2>${artwork(card,true)}${card.abilities.map(a=>`<h3>${escape(a.title)}</h3><p>${escape(a.text)}</p>`).join('')}`;
    $('owned-detail').showModal();CardTextFit.schedule($('owned-detail-content'));
  });
  $('owned-close').onclick=()=>$('owned-detail').close();$('owned-retry').onclick=load;$('owned-search').oninput=render;
  $('language').value=CardI18n.language;$('language').addEventListener('change',()=>{CardI18n.setLanguage($('language').value);CardI18n.applyUI();render();});
  CardI18n.applyUI();load();
})();
