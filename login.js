// 登入頁面邏輯：送出帳密到 functions/api/login.js，並依錯誤代碼顯示對應訊息。
//
// 跟 register.js 不同，這裡刻意「不」做即時可用性檢查（畢竟這是登入，不是
// 「這個使用者名稱可不可以用」這種問題），表單也只有兩個欄位，邏輯單純很多。
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const I18n = window.CardI18n;
  const t = key => I18n.t(key);

  function setFormMessage(text, tone) {
    const el = $('login-form-message');
    if (!el) return;
    el.textContent = text || '';
    el.dataset.tone = tone || '';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const identifier = $('field-identifier').value.trim();
    const password = $('field-login-password').value;

    if (!identifier || !password) {
      setFormMessage(t('errRequired'), 'error');
      (identifier ? $('field-login-password') : $('field-identifier')).focus();
      return;
    }

    const submitButton = $('submit-login');
    submitButton.disabled = true;
    submitButton.textContent = t('submitting');
    setFormMessage('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        $('login-form').reset();
        await window.FiresideAccount.refresh();
        showSignedInState(data.user);
        return;
      }

      if (data.error === 'locked') {
        setFormMessage(`${t('errAccountLockedPrefix')}${data.remainingMinutes}${t('errAccountLockedSuffix')}`, 'error');
      } else if (data.error === 'validation-failed') {
        setFormMessage(t('errRequired'), 'error');
      } else {
        // 涵蓋 'invalid-credentials'（帳號不存在或密碼錯，統一顯示同一句話，
        // 避免使用者枚舉攻擊——詳見 functions/api/login.js 開頭的說明）。
        setFormMessage(t('errInvalidCredentials'), 'error');
      }
    } catch {
      setFormMessage(t('registerServerError'), 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = t('submitLogin');
    }
  }

  function showSignedInState(user) {
    $('login-form').hidden = true;
    $('login-signed-in').hidden = false;
    const text = $('login-signed-in-text');
    if (text) text.textContent = `${t('alreadyLoggedInBefore')}${user.username}${t('alreadyLoggedInAfter')}`;
  }

  function showFormState() {
    $('login-form').hidden = false;
    $('login-signed-in').hidden = true;
  }

  async function handleLogout() {
    const button = $('login-logout');
    button.disabled = true;
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch { /* 就算 API 打不到，還是讓畫面回到表單狀態 */ }
    await window.FiresideAccount.refresh();
    showFormState();
    button.disabled = false;
  }

  // 頁面上所有寫死的中文文字，語言切換時要重新套用一次。
  function applyLoginUI() {
    document.title = `${t('loginHeading')} | ${t('brand')}`;
    $('login-heading').textContent = t('loginHeading');
    $('login-intro').textContent = t('loginIntro');
    $('label-identifier').textContent = t('fieldIdentifier');
    $('label-login-password').textContent = t('fieldPassword');
    $('submit-login').textContent = t('submitLogin');
    $('login-go-home').textContent = t('goToHome');
    $('login-logout').textContent = t('logout');
    $('no-account-yet').textContent = t('noAccountYet');
    $('go-to-register').textContent = t('goToRegister');
    // I18n.applyUI() 只認得「跳至卡牌庫」這種首頁通用文字，這裡蓋回登入頁專屬的版本。
    const skip = document.querySelector('.skip');
    if (skip) skip.textContent = t('skipToLogin');
    const section = document.querySelector('.register');
    if (section) section.setAttribute('aria-label', t('loginHeading'));
    const user = window.FiresideAccount && window.FiresideAccount.user;
    if (user) showSignedInState(user);
  }

  function init() {
    I18n.applyUI();
    applyLoginUI();
    $('login-form').addEventListener('submit', handleSubmit);
    $('login-logout').addEventListener('click', handleLogout);
    if ($('language')) {
      // 語言切換時，除了這頁自己的文字，也要重新呼叫 I18n.applyUI()，
      // 不然導覽列／Logo／頁尾這些「共用」文字不會跟著切換語言
      // （這正是先前「明明選了繁中，畫面卻還是英文/日文夾雜」的原因）。
      $('language').addEventListener('change', () => {
        I18n.applyUI();
        applyLoginUI();
      });
    }
    document.addEventListener('fireside-account-ready', event => {
      if (event.detail.user) showSignedInState(event.detail.user);
      else showFormState();
    });
  }

  init();
})();
