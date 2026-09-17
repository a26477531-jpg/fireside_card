// 帳號狀態（登入中的使用者）共用邏輯：首頁導覽列跟註冊頁都會用到，
// 所以獨立成一支 script，用 /api/me 讀取目前的登入狀態，更新導覽列上的
// 「註冊／已登入的使用者名稱」那個連結。日後做「個人收藏卡片」頁面時，
// 也可以直接用 window.FiresideAccount.fetchMe() 判斷現在是誰登入。
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const I18n = window.CardI18n;

  let cachedUser = null;

  async function fetchMe() {
    try {
      const response = await fetch('/api/me', { credentials: 'same-origin' });
      if (!response.ok) return null;
      const data = await response.json();
      return data.user || null;
    } catch {
      // API 還沒部署（例如純靜態預覽環境）或離線時，安靜地當作未登入，
      // 不要讓整個頁面因為這支 fetch 掛掉。
      return null;
    }
  }

  function renderNav(user) {
    const link = $('nav-account');
    if (!link) return;
    link.textContent = user ? user.username : (I18n ? I18n.t('register') : '註冊');
    link.classList.toggle('is-signed-in', Boolean(user));
  }

  async function refresh() {
    cachedUser = await fetchMe();
    renderNav(cachedUser);
    document.dispatchEvent(new CustomEvent('fireside-account-ready', { detail: { user: cachedUser } }));
    return cachedUser;
  }

  if ($('language')) {
    $('language').addEventListener('change', () => {
      // 不管這個事件是不是已經被別支 script 的 change handler 處理過語言切換，
      // 這裡都再呼叫一次 setLanguage 確保接下來讀到的 I18n.language 是最新的，
      // 不用擔心多支 script 的 <script> 註冊順序誰先誰後。
      if (I18n) I18n.setLanguage($('language').value);
      renderNav(cachedUser);
    });
  }

  window.FiresideAccount = {
    fetchMe,
    refresh,
    get user() { return cachedUser; },
  };

  refresh();
})();
