'use strict';
(() => {
  const labels = {
    'zh-TW':['加入收藏','取消收藏','只看收藏','請先登入才能收藏','收藏載入失敗，請重試','儲存失敗，請重試','處理中…','登入','重新載入收藏'],
    en:['Add to favorites','Remove favorite','Favorites only','Sign in to save favorites','Unable to load favorites. Retry.','Unable to save. Retry.','Working…','Log in','Reload favorites'],
    ja:['お気に入りに追加','お気に入りを解除','お気に入りのみ','ログインしてください','読み込みに失敗しました','保存に失敗しました','処理中…','ログイン','再読み込み'],
    ko:['즐겨찾기 추가','즐겨찾기 해제','즐겨찾기만','로그인해 주세요','불러오기 실패. 다시 시도하세요','저장 실패. 다시 시도하세요','처리 중…','로그인','다시 불러오기']
  };
  const text = i => (labels[CardI18n.language] || labels['zh-TW'])[i];
  const pageLabels = {
    'zh-TW': ['我的收藏','載入收藏中…','請登入以查看你的收藏。','尚無收藏卡牌','前往卡牌庫，開啟卡牌詳情並加入收藏。','瀏覽卡牌庫','收藏卡牌目前無法顯示','收藏紀錄仍保留，卡牌可能已下架。'],
    en: ['Wishlist','Loading favorites…','Sign in to view your favorites.','No favorites yet','Open card details in the library to add favorites.','Browse card library','Favorites currently unavailable','Your favorites are saved, but the cards may have been archived.'],
    ja: ['お気に入り','読み込み中…','お気に入りを見るにはログインしてください。','お気に入りはまだありません','カードライブラリで詳細を開いて追加してください。','カードライブラリへ','表示できるお気に入りがありません','登録は保持されていますが、カードの公開が終了した可能性があります。'],
    ko: ['즐겨찾기','불러오는 중…','즐겨찾기를 보려면 로그인해 주세요.','즐겨찾기가 없습니다','카드 라이브러리에서 상세 정보를 열어 추가하세요.','카드 라이브러리 보기','표시할 수 있는 즐겨찾기가 없습니다','즐겨찾기는 저장되어 있지만 카드가 비공개로 전환되었을 수 있습니다.']
  };
  const pageText = i => (pageLabels[CardI18n.language] || pageLabels['zh-TW'])[i];
  let ids = new Set(), user = null, ready = false, busy = false, current = null, generation = 0;
  let accountReady = false, loading = false;
  const bar = document.createElement('div');
  bar.className = 'favorites-toolbar';
  bar.innerHTML = '<button type="button" class="gold-button"></button><p role="status"></p><a href="login.html" hidden></a>';
  bar.hidden = !isFavoritesPage;
  document.querySelector('.results-toolbar').before(bar);
  const retry = bar.querySelector('button'), status = bar.querySelector('p'), login = bar.querySelector('a');
  const browse = document.createElement('a');
  browse.href = 'index.html#library'; browse.className = 'gold-button'; browse.hidden = true;
  document.getElementById('empty').append(browse);
  function renderPage(count) {
    document.title = `${pageText(0)} | ${CardI18n.t('brand')}`;
    const available = ready && user && window.FiresideCatalog?.state === 'ready';
    document.getElementById('empty').hidden = !available || count !== 0;
    document.querySelector('.view-controls').hidden = !available;
    document.getElementById('results-count').hidden = !available;
    const emptyCollection = available && !window.CARDS.some(card => ids.has(card.id));
    document.querySelector('#empty h3').textContent = emptyCollection ? pageText(ids.size ? 6 : 3) : CardI18n.t('empty');
    document.querySelector('#empty p').textContent = emptyCollection ? pageText(ids.size ? 7 : 4) : CardI18n.t('emptyHelp');
    document.getElementById('empty-reset').hidden = Boolean(emptyCollection);
    browse.hidden = !emptyCollection; browse.textContent = pageText(5);
  }
  function sync() {
    retry.textContent = text(8);
    retry.hidden = !user || ready || loading;
    login.hidden = !accountReady || Boolean(user); login.textContent = text(7);
    if (!accountReady || loading) status.textContent = pageText(1);
    else if (!user) status.textContent = pageText(2);
    else if (!ready) status.textContent = text(4);
    if (current) mount(current);
  }
  async function load() {
    const version = ++generation;
    ready = false; loading = Boolean(user); ids = new Set(); status.textContent = ''; sync(); render();
    if (!user) return;
    try {
      const response = await fetch('/api/favorites', {credentials:'same-origin',cache:'no-store'});
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data.ok || !Array.isArray(data.cardIds)) throw new Error();
      if (version !== generation) return;
      ids = new Set(data.cardIds); ready = true;
      status.textContent = '';
    } catch { if(version === generation) status.textContent = text(4); }
    if(version === generation) { loading = false; sync(); render(); }
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
    } else if (!ready) message.textContent = loading ? pageText(1) : text(4);
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
  window.CardFavorites = {has:id=>ids.has(id), get title(){return pageText(0);}, mount, renderPage};
  retry.addEventListener('click',load);
  document.addEventListener('fireside-account-ready',event=>{accountReady=true;user=event.detail.user;load();});
  document.getElementById('language').addEventListener('change',()=>{sync();render();});
  document.getElementById('detail').addEventListener('close',()=>{current=null;});
  sync(); render();
})();
