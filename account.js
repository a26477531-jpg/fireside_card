// 帳號狀態（登入中的使用者）共用邏輯：首頁導覽列跟註冊頁都會用到，
// 所以獨立成一支 script，用 /api/me 讀取目前的登入狀態，更新導覽列上的
// 「註冊／已登入的使用者名稱」那個連結，以及目前的金幣餘額。
// 日後做「個人收藏卡片」頁面時，也可以直接用 window.FiresideAccount.fetchMe() 判斷現在是誰登入。
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

  function formatCoins(amount) {
    const value = Number(amount) || 0;
    const label = I18n ? I18n.t('coins') : '金幣';
    return `🪙 ${value.toLocaleString(I18n?.language)} ${label}`;
  }

  function renderNav(user) {
    let adminLink = $('nav-admin');
    if (user?.role !== 'admin') { adminLink?.remove(); adminLink=null; }
    if (user?.role === 'admin' && !adminLink && document.querySelector('.navbar')) {
      adminLink=document.createElement('a');adminLink.id='nav-admin';adminLink.href='admin.html';adminLink.className='nav-account';
      document.querySelector('.navbar').append(adminLink);
    }
    if(adminLink){adminLink.hidden=user?.role!=='admin';adminLink.textContent=({'zh-TW':'管理後台',en:'Admin',ja:'管理',ko:'관리'})[I18n?.language]||'管理後台';}

    // 金幣餘額：只在登入時顯示，插在「註冊／使用者名稱」連結前面。
    let coinsLink = $('nav-coins');
    if (!user) { coinsLink?.remove(); coinsLink=null; }
    if (user && !coinsLink && document.querySelector('.navbar')) {
      coinsLink = document.createElement('a');
      coinsLink.id = 'nav-coins';
      coinsLink.className = 'nav-account nav-coins';
      coinsLink.href = 'shop.html#topup-panel';
      const accountLink = $('nav-account');
      if (accountLink) accountLink.before(coinsLink);
      else document.querySelector('.navbar').append(coinsLink);
    }
    if (coinsLink) coinsLink.textContent = formatCoins(user.coinBalance);

    const link = $('nav-account');
    if (link) {
      link.textContent = user ? user.username : (I18n ? I18n.t('register') : '註冊');
      link.classList.toggle('is-signed-in', Boolean(user));
    }
    // 已登入時不需要再顯示「登入」連結（不然點進去只會看到「你已經登入」的畫面）。
    const loginLink = $('nav-login');
    if (loginLink) {
      loginLink.hidden = Boolean(user);
      loginLink.textContent = I18n ? I18n.t('login') : '登入';
    }
  }

  async function refresh() {
    cachedUser = await fetchMe();
    renderNav(cachedUser);
    document.dispatchEvent(new CustomEvent('fireside-account-ready', { detail: { user: cachedUser } }));
    return cachedUser;
  }

  // 加值成功後呼叫這支：不用重新打一次 /api/me，直接把後端回傳的最新餘額
  // 更新到快取的使用者物件上，導覽列跟商城頁的金幣顯示就會立刻同步。
  function updateCoinBalance(coinBalance) {
    if (!cachedUser) return;
    cachedUser = { ...cachedUser, coinBalance };
    renderNav(cachedUser);
    document.dispatchEvent(new CustomEvent('fireside-coins-updated', { detail: { user: cachedUser } }));
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
    updateCoinBalance,
    get user() { return cachedUser; },
  };

  refresh();
})();
