/* UI state and rendering. Edit card content in cards-data.js. */
'use strict';
const $ = id => document.getElementById(id);
const state = { mana: null, page: 1, view: 'grid' };
const PAGE_SIZE = 15;
const I18n = window.CardI18n;
const t = key => I18n.t(key);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const abilityText = card => card.abilities.map(a => `${a.title} ${a.text}`).join(' ');
function filteredCards() {
  const search = $('search').value.trim().toLocaleLowerCase();
  const list = window.CARDS.map(base => ({...I18n.card(base), filterText: abilityText(base)})).filter(card =>
    ($('set').value === 'all' || card.collection === $('set').value) &&
    ($('ability').value === 'all' || card.filterText.includes($('ability').value)) &&
    (state.mana === null || (state.mana === 10 ? card.mana >= 10 : card.mana === state.mana)) &&
    card.attack >= Math.max(0, Number($('attack').value) || 0) &&
    card.health >= Math.max(0, Number($('health').value) || 0) &&
    `${card.name} ${card.subtitle} ${abilityText(card)}`.toLocaleLowerCase().includes(search));
  const sorts = { 'mana-asc': (a,b) => a.mana-b.mana, 'mana-desc': (a,b) => b.mana-a.mana, 'attack-desc': (a,b) => b.attack-a.attack, name: (a,b) => a.name.localeCompare(b.name,I18n.language) };
  return list.sort(sorts[$('sort').value]);
}
function render() {
  const list = filteredCards();
  const pages = Math.max(1, Math.ceil(list.length/PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const collection = I18n.collection($('set').value);
  $('results-count').innerHTML = `${escapeHTML(collection)} · <strong>${list.length}</strong> ${escapeHTML(t('results'))}`;
  $('section-heading').textContent = collection;
  $('cards').className = `cards-grid${state.view === 'list' ? ' list' : ''}`;
  $('cards').innerHTML = list.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE).map(card => `<button class="card" data-id="${escapeHTML(card.id)}" aria-label="${escapeHTML(t('view'))} ${escapeHTML(card.name)}, ${escapeHTML(t('mana'))} ${card.mana}, ${escapeHTML(t('attack'))} ${card.attack}, ${escapeHTML(t('health'))} ${card.health}">${artwork(card)}<div class="card-caption"><h3>${escapeHTML(card.name)}</h3><p>${escapeHTML(I18n.collection(card.collection))} · ${card.mana} ${escapeHTML(t('mana'))}</p></div><p class="list-description">${escapeHTML(abilityText(card))}</p></button>`).join('');
  window.CardTextFit.schedule($('cards'));
  $('empty').hidden = list.length !== 0;
  $('pagination').hidden = pages <= 1;
  $('pagination').innerHTML = `<button data-page="${state.page-1}" ${state.page === 1 ? 'disabled' : ''} aria-label="${escapeHTML(t('prev'))}">‹</button>${Array.from({length:pages},(_,i) => `<button data-page="${i+1}" ${state.page === i+1 ? 'class="selected" aria-current="page"' : ''}>${i+1}</button>`).join('')}<button data-page="${state.page+1}" ${state.page === pages ? 'disabled' : ''} aria-label="${escapeHTML(t('next'))}">›</button>`;
  document.querySelectorAll('[data-mana]').forEach(button => { const selected = Number(button.dataset.mana) === state.mana; button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected)); });
  document.querySelectorAll('[data-collection]').forEach(button => { const selected = button.dataset.collection === $('set').value;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected)); });
}
function resetFilters() {
  $('set').value = $('ability').value = 'all';$('search').value = '';$('attack').value = $('health').value = '0';state.mana = null;state.page = 1;render();
}
let detailOpener;
let detailId = null;
function openDetail(id, opener) {
  const base = window.CARDS.find(card => card.id === id);
  if (!base) return;
  const card = I18n.card(base);
  detailId = id;
  if (opener) detailOpener = opener;
  $('detail-content').innerHTML = `${artwork(card,true)}<div class="detail-copy"><p class="collection">${escapeHTML(I18n.collection(card.collection))}</p><h2 id="detail-title">${escapeHTML(card.name)}</h2><p class="subtitle">${escapeHTML(card.subtitle)}</p><div class="stats"><span>${escapeHTML(t('mana'))} <b>${card.mana}</b></span><span>${escapeHTML(t('attack'))} <b>${card.attack}</b></span><span>${escapeHTML(t('health'))} <b>${card.health}</b></span></div>${card.abilities.map(a => `<h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.text)}</p>`).join('')}</div>`;
  if (!$('detail').open) $('detail').showModal();
  window.CardTextFit.schedule($('detail-content'));
}
$('mana-filter').innerHTML = Array.from({length:11},(_,i) => `<button data-mana="${i}" aria-pressed="false" aria-label="${i === 10 ? '10 點以上' : i+' 點'}法力">${i === 10 ? '10+' : i}</button>`).join('');
$('mana-filter').addEventListener('click',event => {const button = event.target.closest('[data-mana]');if(!button)return;const mana = Number(button.dataset.mana);state.mana = state.mana === mana ? null : mana;state.page = 1;render();});
['set','ability','sort'].forEach(id => $(id).addEventListener('change',() => {state.page=1;render();}));
['search','attack','health'].forEach(id => $(id).addEventListener('input',() => {state.page=1;render();}));
$('collections').addEventListener('click',event => {const button = event.target.closest('[data-collection]');if(!button)return;$('set').value = button.dataset.collection;state.page=1;render();});
$('more-toggle').addEventListener('click',() => {const open = $('extra-filters').hidden;$('extra-filters').hidden=!open;$('more-toggle').setAttribute('aria-expanded',String(open));});
['reset','empty-reset'].forEach(id => $(id).addEventListener('click',resetFilters));
['grid','list'].forEach(view => $(view+'-view').addEventListener('click',() => {state.view=view;['grid','list'].forEach(v => {$(v+'-view').classList.toggle('selected',v===view);$(v+'-view').setAttribute('aria-pressed',String(v===view));});render();}));
$('cards').addEventListener('click',event => {const button=event.target.closest('[data-id]');if(button)openDetail(button.dataset.id,button);});
$('pagination').addEventListener('click',event => {const button=event.target.closest('[data-page]');if(!button||button.disabled)return;state.page=Number(button.dataset.page);render();$('library').scrollIntoView();$('pagination').querySelector('[aria-current="page"]')?.focus({preventScroll:true});});
$('close-detail').addEventListener('click',() => $('detail').close());
$('detail').addEventListener('click',event => {if(event.target !== $('detail'))return;const rect=$('detail').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$('detail').close();});
$('detail').addEventListener('close',() => {detailId=null;detailOpener?.focus();});
$('language').addEventListener('change',() => {
  I18n.setLanguage($('language').value);
  I18n.applyUI();
  state.page=1;
  render();
  if (detailId) openDetail(detailId);
});
I18n.applyUI();
render();

// 卡牌載入動畫：卡牌其實是同步組裝好的，這裡刻意讓動畫至少停留一小段時間再切換，
// 避免動畫一閃而過；時間到（或裝置偏好減少動態效果時）就立刻切到卡牌畫面。
// 之後若改成從伺服器/API 抓卡牌資料，把 render() 換成非同步取得資料後再呼叫，
// 並在資料回來時呼叫 revealCards()，就能接上真正的載入等待。
(() => {
  const MIN_VISIBLE_MS = 500;
  const started = performance.now();
  function revealCards() {
    $('cards-loading').hidden = true;
    $('library-results').hidden = false;
    // render() 稍早已呼叫過 CardTextFit.schedule()，但當時 #library-results 還是
    // hidden（寬度為 0），縮字判斷會直接跳過所有卡牌，導致第一次看到卡牌時字級
    // 未經縮放、容易出框；等真正顯示出來、有寬度可量測時，這裡要再排一次縮字。
    window.CardTextFit.schedule($('cards'));
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealCards();
  } else {
    setTimeout(revealCards, Math.max(0, MIN_VISIBLE_MS - (performance.now() - started)));
  }
})();

