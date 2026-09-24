// 商城由 D1 catalog 提供商品與金幣價格，結帳由 commerce.js 呼叫購買 API。
// 詳情与縮圖共用 card-artwork.js 的卡牌文字排版。
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const I18n = window.CardI18n;
  const t = key => window.CardCommerce?.t(key) || I18n.t(key);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  // cardIds 對應資料庫卡牌；只顯示已上架且卡牌完整的商品。
  let BUNDLES = [];

  let openBundleId = null;    // 目前開啟中的組合包詳情彈窗（供語言切換／幣別更新時重新渲染）
  let shopDetailOpener = null; // 開啟詳情彈窗的按鈕，關閉時把焦點還給它

  function formatPrice(bundle) {
    return `${bundle.coinPrice.toLocaleString(I18n.language)} ${t('coins')}`;
  }

  function bundleCards(bundle) {
    return bundle.cardIds
      .map(id => window.CARDS.find(c => c.id === id))
      .filter(Boolean)
      .map(base => I18n.card(base));
  }

  function render() {
    const grid = $('shop-grid');
    if (!grid || !window.CARDS) return;
    grid.innerHTML = BUNDLES.map(bundle => {
      const cards = bundleCards(bundle);
      const title = bundle.name || cards.map(c => c.name).join(' × ');
      const thumbs = cards.map(card => window.artwork(card)).join('');
      return `<article class="shop-card">
        <button class="shop-card-open" type="button" data-bundle="${escapeHTML(bundle.id)}" aria-label="${escapeHTML(t('view'))} ${escapeHTML(title)}">
          <div class="shop-thumbs">${thumbs}</div>
          <h3 class="shop-card-title">${escapeHTML(title)}</h3>
          <p class="shop-card-desc">${escapeHTML(t('shopBundle'))}</p>
        </button>
        <div class="shop-card-footer">
          <span class="shop-price">${formatPrice(bundle)}</span>
          <button class="gold-button shop-buy" data-bundle="${escapeHTML(bundle.id)}" type="button">${escapeHTML(t('shopBuy'))}</button>
        </div>
      </article>`;
    }).join('');
    window.CardTextFit.schedule(grid);
  }

  // 單張卡牌在詳情彈窗裡的區塊：大圖（含卡面上的名稱／規則文字）
  // 加上一定看得清楚的純文字資料（系列、名稱、副標、數值、能力說明）。
  function cardDetailBlock(card) {
    return `<div class="shop-detail-card">
      ${window.artwork(card, true)}
      <div class="detail-copy">
        <p class="collection">${escapeHTML(I18n.collection(card.collection))}</p>
        <p class="shop-detail-card-name">${escapeHTML(card.name)}</p>
        <p class="subtitle">${escapeHTML(card.subtitle)}</p>
        <div class="stats">
          <span>${escapeHTML(t('mana'))} <b>${card.mana}</b></span>
          <span>${escapeHTML(t('attack'))} <b>${card.attack}</b></span>
          <span>${escapeHTML(t('health'))} <b>${card.health}</b></span>
        </div>
        ${card.abilities.map(a => `<h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.text)}</p>`).join('')}
      </div>
    </div>`;
  }

  function openShopDetail(bundleId, opener) {
    const bundle = BUNDLES.find(b => b.id === bundleId);
    if (!bundle || !window.CARDS || !$('shop-detail')) return;
    const cards = bundleCards(bundle);
    if (!cards.length) return;
    openBundleId = bundleId;
    if (opener) shopDetailOpener = opener;
    const title = bundle.name || cards.map(c => c.name).join(' × ');
    $('shop-detail-content').innerHTML = `
      <div class="shop-detail-header">
        <p class="collection">${escapeHTML(t('shopBundle'))}</p>
        <h2 id="shop-detail-title">${escapeHTML(title)}</h2>
      </div>
      <div class="shop-detail-cards">${cards.map(cardDetailBlock).join('')}</div>
      <div class="shop-detail-footer">
        <span class="shop-price">${formatPrice(bundle)}</span>
        <button class="gold-button shop-buy" data-bundle="${escapeHTML(bundle.id)}" type="button">${escapeHTML(t('shopBuy'))}</button>
      </div>`;
    if (!$('shop-detail').open) $('shop-detail').showModal();
    window.CardTextFit.schedule($('shop-detail-content'));
  }

  function showToast(message) {
    let toast = $('shop-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'shop-toast';
      toast.className = 'shop-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  // 金幣加值面板：登入時顯示目前餘額＋三個加值按鈕，未登入時顯示「請先登入」提示。
  function applyTopupPanel() {
    const user = window.FiresideAccount && window.FiresideAccount.user;
    const panel = $('topup-panel');
    const loginHint = $('topup-login-hint');
    if (!panel || !loginHint) return;
    panel.hidden = !user;
    loginHint.hidden = Boolean(user);
    if (user) {
      if ($('topup-balance-label')) $('topup-balance-label').textContent = `${t('coinBalanceLabel')}：${Number(user.coinBalance || 0).toLocaleString(I18n.language)} ${t('coins')}`;
      if ($('topup-panel-intro')) $('topup-panel-intro').textContent = t('topupPanelIntro');
      for (const button of panel.querySelectorAll('.topup-option')) {
        button.textContent = t('topupOptionLabel')(button.dataset.amount);
      }
    } else {
      if ($('topup-login-hint-text')) $('topup-login-hint-text').textContent = t('topupLoginRequired') + ' ';
      if ($('topup-login-hint-link')) $('topup-login-hint-link').textContent = t('topupGoLogin');
    }
  }

  function applyShopUI() {
    I18n.applyUI();
    document.title = `${t('shop')} | ${t('brand')}`;
    const skip = document.querySelector('.skip');
    if (skip) skip.textContent = t('shop');
    const heading = $('shop-heading');
    if (heading) heading.textContent = t('shop');
    if ($('shop-intro')) $('shop-intro').textContent = t('shopIntro');
    if ($('close-shop-detail')) $('close-shop-detail').setAttribute('aria-label', t('shopClose'));
    applyTopupPanel();
    render();
    if (openBundleId && $('shop-detail').open) openShopDetail(openBundleId);
  }

  if ($('topup-panel')) {
    $('topup-panel').addEventListener('click', event => {
      const button = event.target.closest('.topup-option');
      if (button) window.location.href = `topup.html?amount=${encodeURIComponent(button.dataset.amount)}`;
    });
  }

  document.addEventListener('fireside-account-ready', applyTopupPanel);
  document.addEventListener('fireside-coins-updated', applyTopupPanel);


  if ($('shop-grid')) {
    $('shop-grid').addEventListener('click', event => {
      const buyButton = event.target.closest('.shop-buy');
      if (buyButton) { window.CardCommerce.buy(BUNDLES.find(b=>b.id===buyButton.dataset.bundle)); return; }
      const openButton = event.target.closest('.shop-card-open');
      if (openButton) openShopDetail(openButton.dataset.bundle, openButton);
    });
  }

  // 詳情彈窗裡的「加入購物車」按鈕不在 #shop-grid 底下，需另外委派事件。
  if ($('shop-detail-content')) {
    $('shop-detail-content').addEventListener('click', event => {
      const button=event.target.closest('.shop-buy');
      if (button) window.CardCommerce.buy(BUNDLES.find(b=>b.id===button.dataset.bundle));
    });
  }

  if ($('close-shop-detail')) {
    $('close-shop-detail').addEventListener('click', () => $('shop-detail').close());
  }

  if ($('shop-detail')) {
    // 點擊彈窗以外的深色背景（backdrop）時關閉，比照卡牌詳情彈窗的行為。
    $('shop-detail').addEventListener('click', event => {
      if (event.target !== $('shop-detail')) return;
      const rect = $('shop-detail').getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        $('shop-detail').close();
      }
    });
    $('shop-detail').addEventListener('close', () => { openBundleId = null; shopDetailOpener?.focus(); });
  }

  if ($('language')) {
    $('language').addEventListener('change', () => {
      I18n.setLanguage($('language').value);
      applyShopUI();
    });
  }

  applyShopUI();
  document.addEventListener('fireside-catalog-ready', () => {
    BUNDLES = window.FiresideCatalog.products;
    if (openBundleId && !BUNDLES.some(b=>b.id===openBundleId)) $('shop-detail').close();
    applyShopUI();
  });
})();
