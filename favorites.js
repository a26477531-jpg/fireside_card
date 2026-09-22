'use strict';
(() => {
  const labels = {
    'zh-TW':['加入收藏','取消收藏','只看收藏','請先登入才能收藏','收藏載入失敗，請重試','儲存失敗，請重試','處理中…','登入','重新載入收藏'],
    en:['Add to favorites','Remove favorite','Favorites only','Sign in to save favorites','Unable to load favorites. Retry.','Unable to save. Retry.','Working…','Log in','Reload favorites'],
    ja:['お気に入りに追加','お気に入りを解除','お気に入りのみ','ログインしてください','読み込みに失敗しました','保存に失敗しました','処理中…','ログイン','再読み込み'],
    ko:['즐겨찾기 추가','즐겨찾기 해제','즐겨찾기만','로그인해 주세요','불러오기 실패. 다시 시도하세요','저장 실패. 다시 시도하세요','처리 중…','로그인','다시 불러오기']
  };
  const text = i => (labels[CardI18n.language] || labels['zh-TW'])[i];
  let ids = new Set(), user = null, ready = false, busy = false, current = null, generation = 0;
  const bar = document.createElement('div');
  bar.className = 'favorites-toolbar';
  bar.innerHTML = '<label><input type="checkbox" id="favorites-only"> <span></span></label> <button type="button" class="gold-button"></button><p role="status"></p>';
  document.querySelector('.results-toolbar').before(bar);
  const checkbox = bar.querySelector('input'), retry = bar.querySelector('button'), status = bar.querySelector('p');
  function sync() {
    bar.querySelector('span').textContent = text(2);
    retry.textContent = text(8);
    checkbox.disabled = !ready || !user;
    retry.hidden = !user || ready;
    if (current) mount(current);
  }
  async function load() {
    const version = ++generation;
    ready = false; ids = new Set(); checkbox.checked = false; status.textContent = ''; sync(); render();
    if (!user) return;
    try {
      const response = await fetch('/api/favorites', {credentials:'same-origin',cache:'no-store'});
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data.ok || !Array.isArray(data.cardIds)) throw new Error();
      if (version !== generation) return;
      ids = new Set(data.cardIds); ready = true;
      if(new URLSearchParams(location.search).get('favorites')==='1')checkbox.checked=true;
    } catch { if(version === generation) status.textContent = text(4); }
    if(version === generation) { sync(); render(); }
  }
  function mount(id) {
    current = id;
    document.getElementById('favorite-control')?.remove();
    const control = document.createElement('div'); control.id = 'favorite-control';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'gold-button';
    button.textContent = busy ? text(6) : text(ids.has(id) ? 1 : 0);
    button.setAttribute('aria-pressed',String(ids.has(id)));
    button.disabled = busy || Boolean(user && !ready);
    const message = document.createElement('p'); message.setAttribute('role','status');
    control.append(button,message);
    if (!user) {
      message.textContent = text(3)+' ';
      const link = document.createElement('a'); link.href = 'login.html'; link.textContent = text(7); message.append(link);
    } else if (!ready) message.textContent = text(4);
    button.addEventListener('click', async () => {
      if (!user) { control.querySelector('a').focus(); return; }
      if (!ready || busy) return;
      const remove = ids.has(id), version = generation;
      status.textContent = '';
      busy = true; sync();
      try {
        const response = await fetch('/api/favorites',{method:remove?'DELETE':'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardId:id})});
        if (!response.ok || !(await response.json()).ok) throw new Error();
        if(version !== generation) return;
        remove ? ids.delete(id) : ids.add(id);
        render();
      } catch { if(version === generation) status.textContent = text(5); }
      finally { busy = false; sync(); const notice = document.querySelector('#favorite-control p'); if(notice && status.textContent) notice.textContent = status.textContent; }
    });
    document.querySelector('#detail-content .detail-copy')?.prepend(control);
  }
  window.CardFavorites = {has:id=>ids.has(id), get only(){return checkbox.checked;}, mount};
  checkbox.addEventListener('change',()=>{state.page=1;render();});
  retry.addEventListener('click',load);
  document.addEventListener('fireside-account-ready',event=>{user=event.detail.user;load();});
  document.getElementById('language').addEventListener('change',sync);
  document.getElementById('detail').addEventListener('close',()=>{current=null;});
  sync();
})();
