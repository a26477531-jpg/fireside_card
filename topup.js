// 模擬扣款頁面邏輯：
// - 從網址帶入的 amount（只允許 50 / 100 / 150）決定這次要加值多少金幣。
// - 表單上的卡號／有效期限／安全碼／持卡人姓名全部是唯讀的示意欄位，
//   使用者跟管理員都無法填寫或修改，純粹讓畫面看起來像一個付款流程。
// - 按下右下角「扣款」按鈕才會呼叫 /api/topup，效果只有把金幣加進帳號，
//   不會有任何真實金流、也不會蒐集任何付款資訊。
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const I18n = window.CardI18n;
  const t = key => I18n.t(key);
  const ALLOWED_AMOUNTS = new Set([50, 100, 150]);

  const amount = Number(new URLSearchParams(window.location.search).get('amount'));
  const validAmount = ALLOWED_AMOUNTS.has(amount);

  // view 追蹤目前畫面狀態，語言切換時要照這個狀態重新套用文字，
  // 不然例如已經顯示「加值成功」畫面，切換語言後又跳回表單畫面就很奇怪。
  let view = 'loading'; // loading | login-required | invalid | ready | success
  let lastBalance = null;

  function showView(next) {
    view = next;
    $('topup-login-required').hidden = next !== 'login-required';
    $('topup-invalid').hidden = next !== 'invalid';
    $('topup-success').hidden = next !== 'success';
    $('topup-form').hidden = next !== 'ready';
  }

  function applyTopupUI() {
    document.title = `${t('topupPageHeading')} | ${t('brand')}`;
    $('topup-heading').textContent = t('topupPageHeading');
    $('topup-intro').textContent = t('topupPageIntro');

    $('topup-login-required-text').textContent = t('topupLoginRequired');
    $('topup-login-required-link').textContent = t('topupGoLogin');

    $('topup-invalid-text').textContent = t('topupInvalidAmount');

    $('topup-amount-label').textContent = t('topupAmountLabel');
    if (validAmount) $('topup-amount-value').textContent = `${amount.toLocaleString(I18n.language)} ${t('coins')}`;

    $('topup-label-card-number').textContent = t('topupCardNumber');
    $('topup-label-expiry').textContent = t('topupExpiry');
    $('topup-label-cvv').textContent = t('topupCvv');
    $('topup-label-cardholder').textContent = t('topupCardholder');
    $('topup-mock-notice').textContent = t('topupMockNotice');
    $('topup-confirm').textContent = view === 'charging' ? t('topupProcessing') : t('topupConfirm');

    if (view === 'success') {
      $('topup-success-text').textContent = t('topupSuccess');
      $('topup-success-balance').textContent = `${t('topupNewBalancePrefix')}${Number(lastBalance).toLocaleString(I18n.language)} ${t('coins')}`;
      $('topup-success-back').textContent = t('topupBackToShop');
    }

    const skip = document.querySelector('.skip');
    if (skip) skip.textContent = t('skipToTopup');
    const section = document.querySelector('.topup');
    if (section) section.setAttribute('aria-label', t('topupPageHeading'));
  }

  async function handleConfirm() {
    const button = $('topup-confirm');
    const message = $('topup-form-message');
    button.disabled = true;
    button.textContent = t('topupProcessing');
    message.textContent = '';
    message.dataset.tone = '';

    try {
      const response = await fetch('/api/topup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        lastBalance = data.coinBalance;
        window.FiresideAccount.updateCoinBalance(data.coinBalance);
        showView('success');
        applyTopupUI();
        return;
      }

      message.textContent = t('topupServerError');
      message.dataset.tone = 'error';
    } catch {
      message.textContent = t('topupServerError');
      message.dataset.tone = 'error';
    } finally {
      button.disabled = false;
      button.textContent = t('topupConfirm');
    }
  }

  function init() {
    I18n.applyUI();

    if (!validAmount) {
      showView('invalid');
    } else {
      // 先假設還在確認登入狀態；fireside-account-ready 事件觸發後才決定
      // 要顯示表單還是「請先登入」提示。
      showView('login-required');
    }
    applyTopupUI();

    $('topup-confirm').addEventListener('click', handleConfirm);

    if ($('language')) {
      $('language').addEventListener('change', () => {
        I18n.applyUI();
        applyTopupUI();
      });
    }

    document.addEventListener('fireside-account-ready', event => {
      if (!validAmount) return; // 無效金額一律顯示錯誤畫面，跟登入狀態無關
      if (view === 'success') return; // 已經加值成功了，不要因為背景重新整理登入狀態就跳回表單
      showView(event.detail.user ? 'ready' : 'login-required');
      applyTopupUI();
    });
  }

  init();
})();
