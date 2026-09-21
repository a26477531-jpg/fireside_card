// 卡包商城：示意用途，不含真實金流。
// 三個組合包，各含 2 張卡牌，基準售價 NT$30；售價依訪客地區（GeoIP）
// 或手動切換的語言自動換算幣別。文字沿用 i18n.js 的 labels（shop 開頭的鍵），
// 卡牌名稱／圖片／能力文字沿用 cards-data.js + translations-data.js 既有資料，
// 不重複維護；詳情彈出視窗重用 card-artwork.js 的 artwork()（同為非模組化 script，
// 會掛在 window 上），版面比照卡牌詳情彈出視窗。
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const I18n = window.CardI18n;
  const t = key => I18n.t(key);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  // 三個組合包：id 僅供內部識別（購物車按鈕、詳情彈窗共用），
  // cardIds 對應 cards-data.js 裡的卡牌 id。
  const BUNDLES = [
    { id: 'deepsea-duo', cardIds: ['25', '13'] },  // 克蘇魯、魚人潮汐祭司
    { id: 'wildland-duo', cardIds: ['08', '11'] }, // 鹿角部族薩滿、空心樹人
    { id: 'inferno-duo', cardIds: ['29', '18'] },  // 地獄火巨人、灰燼獵犬
  ];

  // 幣別對照表：每包固定售價 NT$30，這裡是對應各幣別的「顯示金額」
  // （為題目指定的固定展示值，不是即時匯率換算）。
  const CURRENCY = {
    TWD: { amount: 30, symbol: 'NT$' },
    USD: { amount: 1, symbol: '$' },
    JPY: { amount: 145, symbol: '¥' },
    KRW: { amount: 1230, symbol: '₩' },
  };

  // 使用者手動切換語言時，以此表決定顯示幣別。
  const LANGUAGE_CURRENCY = { 'zh-TW': 'TWD', en: 'USD', ja: 'JPY', ko: 'KRW' };

  // GeoIP 偵測到的國別代碼 → 幣別；未列出的地區（含台灣）維持預設台幣。
  const COUNTRY_CURRENCY = { US: 'USD', KR: 'KRW', JP: 'JPY' };

  const state = { currency: LANGUAGE_CURRENCY[I18n.language] || 'TWD' };
  let manualOverride = false; // 使用者手動切換過語言後，GeoIP 的結果就不再覆蓋顯示幣別
  // 已儲存的語言選擇優先於 IP 地區，重新整理也沿用。
  try { manualOverride = I18n.supported.includes(localStorage.getItem('fireside-language')); } catch {}
  let openBundleId = null;    // 目前開啟中的組合包詳情彈窗（供語言切換／幣別更新時重新渲染）
  let shopDetailOpener = null; // 開啟詳情彈窗的按鈕，關閉時把焦點還給它

  function formatPrice(currencyCode) {
    const c = CURRENCY[currencyCode] || CURRENCY.TWD;
    let amount;
    try { amount = c.amount.toLocaleString(I18n.language); }
    catch { amount = String(c.amount); }
    return `${c.symbol}${amount}`;
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
      const title = cards.map(c => c.name).join(' × ');
      const thumbs = cards.map(card => window.artwork(card)).join('');
      return `<article class="shop-card">
        <button class="shop-card-open" type="button" data-bundle="${escapeHTML(bundle.id)}" aria-label="${escapeHTML(t('view'))} ${escapeHTML(title)}">
          <div class="shop-thumbs">${thumbs}</div>
          <h3 class="shop-card-title">${escapeHTML(title)}</h3>
          <p class="shop-card-desc">${escapeHTML(t('shopBundle'))}</p>
        </button>
        <div class="shop-card-footer">
          <span class="shop-price">${formatPrice(state.currency)}</span>
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
    const title = cards.map(c => c.name).join(' × ');
    $('shop-detail-content').innerHTML = `
      <div class="shop-detail-header">
        <p class="collection">${escapeHTML(t('shopBundle'))}</p>
        <h2 id="shop-detail-title">${escapeHTML(title)}</h2>
      </div>
      <div class="shop-detail-cards">${cards.map(cardDetailBlock).join('')}</div>
      <div class="shop-detail-footer">
        <span class="shop-price">${formatPrice(state.currency)}</span>
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

  function applyShopUI() {
    I18n.applyUI();
    document.title = `${t('shop')} | ${t('brand')}`;
    const skip = document.querySelector('.skip');
    if (skip) skip.textContent = t('shop');
    const heading = $('shop-heading');
    if (heading) heading.textContent = t('shop');
    if ($('shop-intro')) $('shop-intro').textContent = t('shopIntro');
    if ($('close-shop-detail')) $('close-shop-detail').setAttribute('aria-label', t('shopClose'));
    render();
    if (openBundleId && $('shop-detail').open) openShopDetail(openBundleId);
  }

  // 依訪客 IP 偵測地區，設定初始顯示幣別。失敗（離線、被封鎖、超過每日額度等）
  // 時安靜地維持預設台幣，不影響網站其他功能。
  async function detectCurrencyByGeoIP() {
    try {
      const response = await fetch('https://ipwho.is/', { cache: 'no-store' });
      if (!response.ok) throw new Error(`GeoIP request failed: ${response.status}`);
      const data = await response.json();
      if (manualOverride) return; // 使用者在等待回應的同時已手動切換語言，尊重使用者的選擇
      if (data && data.success !== false && data.country_code) {
        state.currency = COUNTRY_CURRENCY[data.country_code] || 'TWD';
        render();
        if (openBundleId && $('shop-detail').open) openShopDetail(openBundleId);
      }
    } catch (error) {
      console.warn('[shop] GeoIP currency detection skipped:', error);
    }
  }

  if ($('shop-grid')) {
    $('shop-grid').addEventListener('click', event => {
      const buyButton = event.target.closest('.shop-buy');
      if (buyButton) { showToast(t('shopAdded')); return; }
      const openButton = event.target.closest('.shop-card-open');
      if (openButton) openShopDetail(openButton.dataset.bundle, openButton);
    });
  }

  // 詳情彈窗裡的「加入購物車」按鈕不在 #shop-grid 底下，需另外委派事件。
  if ($('shop-detail-content')) {
    $('shop-detail-content').addEventListener('click', event => {
      if (event.target.closest('.shop-buy')) showToast(t('shopAdded'));
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
      manualOverride = true;
      state.currency = LANGUAGE_CURRENCY[$('language').value] || 'TWD';
      applyShopUI();
    });
  }

  applyShopUI();
  if (!manualOverride) detectCurrencyByGeoIP();
})();
