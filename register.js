// 註冊頁面邏輯：即時驗證 Email 格式／使用者名稱可用性／密碼強度，
// 送出後呼叫 functions/api/register.js。
//
// 這裡的格式規則要跟 functions/_lib/validation.js 保持一致——前端只是先幫使用者
// 擋一次、體驗好一點，真正說了算的是後端（永遠不能只信任前端送出的資料）。
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const I18n = window.CardI18n;
  const t = key => I18n.t(key);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const USERNAME_RE = /^[\p{L}\p{N}_]{3,20}$/u;
  const PASSWORD_MIN_LENGTH = 8;

  const fields = {
    email: { input: () => $('field-email'), message: () => $('message-email') },
    username: { input: () => $('field-username'), message: () => $('message-username') },
    password: { input: () => $('field-password'), message: () => $('message-password') },
    passwordConfirm: { input: () => $('field-password-confirm'), message: () => $('message-password-confirm') },
  };

  // 每個欄位目前的驗證狀態：null 代表尚未檢查，false 代表通過，其餘是錯誤訊息的 key。
  // （特地用 false 而不是空字串，這樣語言切換時才分得出「通過、要顯示 available 文字」
  // 跟「還沒檢查、什麼都不顯示」的差別，兩者在 if(state[key]) 判斷式下都是 falsy。）
  const state = { email: null, username: null, password: null, passwordConfirm: null };
  let checkEmailToken = 0;
  let checkUsernameToken = 0;

  function setMessage(field, key, tone) {
    const el = fields[field].message();
    if (!el) return;
    el.textContent = key ? t(key) : '';
    el.dataset.tone = tone || (key ? 'error' : '');
  }

  // 語言切換時，把每個欄位目前的驗證狀態換成新語言重新顯示一次
  // （包含「可以使用」這種成功訊息，不能只處理錯誤訊息）。
  function rerenderFieldMessage(field) {
    const value = state[field];
    if (value === null) return; // 還沒檢查過，維持空白
    if (value === false) {
      if (field === 'email' || field === 'username') setMessage(field, 'available', 'success');
      else setMessage(field, null);
      return;
    }
    setMessage(field, value);
  }

  function passwordStrength(password) {
    if (!password) return 0;
    let score = 0;
    if (password.length >= PASSWORD_MIN_LENGTH) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score >= 4 ? 3 : score >= 3 ? 2 : score >= 1 ? 1 : 0;
  }

  function renderPasswordStrength(password) {
    const meter = $('password-strength');
    if (!meter) return;
    const score = passwordStrength(password);
    meter.dataset.score = String(score);
    const labelKey = ['', 'passwordStrengthWeak', 'passwordStrengthMedium', 'passwordStrengthStrong'][score];
    meter.setAttribute('aria-label', labelKey ? t(labelKey) : '');
  }

  // ---- Email ----
  function validateEmailFormat(value) {
    if (!value.trim()) return 'errRequired';
    if (!EMAIL_RE.test(value.trim())) return 'errEmailFormat';
    return null;
  }

  async function checkEmail() {
    const value = fields.email.input().value.trim();
    const formatError = validateEmailFormat(value);
    if (formatError) { state.email = formatError; setMessage('email', formatError); return; }
    const token = ++checkEmailToken;
    setMessage('email', 'checking', 'pending');
    try {
      const response = await fetch(`/api/check-email?email=${encodeURIComponent(value)}`, { credentials: 'same-origin' });
      const data = await response.json();
      if (token !== checkEmailToken) return; // 使用者又改了內容，這次結果已經過期
      if (data.available) { state.email = false; setMessage('email', 'available', 'success'); }
      else { const key = data.reason === 'taken' ? 'errEmailTaken' : 'errEmailFormat'; state.email = key; setMessage('email', key); }
    } catch {
      if (token !== checkEmailToken) return;
      // API 還沒部署或離線：先放行格式檢查結果，交給送出時的後端驗證把關。
      state.email = false;
      setMessage('email', null);
    }
  }

  // ---- Username ----
  function validateUsernameFormat(value) {
    if (!value.trim()) return 'errRequired';
    if (!USERNAME_RE.test(value.trim())) return 'errUsernameFormat';
    return null;
  }

  async function checkUsername() {
    const value = fields.username.input().value.trim();
    const formatError = validateUsernameFormat(value);
    if (formatError) { state.username = formatError; setMessage('username', formatError); return; }
    const token = ++checkUsernameToken;
    setMessage('username', 'checking', 'pending');
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(value)}`, { credentials: 'same-origin' });
      const data = await response.json();
      if (token !== checkUsernameToken) return;
      if (data.available) { state.username = false; setMessage('username', 'available', 'success'); }
      else { const key = data.reason === 'taken' ? 'errUsernameTaken' : 'errUsernameFormat'; state.username = key; setMessage('username', key); }
    } catch {
      if (token !== checkUsernameToken) return;
      state.username = false;
      setMessage('username', null);
    }
  }

  // ---- Password ----
  function validatePasswordValue(value) {
    if (!value) return 'errRequired';
    if (value.length < PASSWORD_MIN_LENGTH) return 'errPasswordTooShort';
    if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) return 'errPasswordTooWeak';
    return null;
  }

  function checkPassword() {
    const value = fields.password.input().value;
    renderPasswordStrength(value);
    const error = validatePasswordValue(value);
    state.password = error || false;
    setMessage('password', error);
    checkPasswordConfirm(); // 密碼改了，確認密碼欄位也要重新比對
  }

  function checkPasswordConfirm() {
    const value = fields.passwordConfirm.input().value;
    const password = fields.password.input().value;
    if (!value) { state.passwordConfirm = 'errRequired'; setMessage('passwordConfirm', null); return; }
    if (value !== password) { state.passwordConfirm = 'errPasswordMismatch'; setMessage('passwordConfirm', 'errPasswordMismatch'); return; }
    state.passwordConfirm = false;
    setMessage('passwordConfirm', null);
  }

  let emailDebounce, usernameDebounce;
  function bindLiveValidation() {
    fields.email.input().addEventListener('input', () => {
      clearTimeout(emailDebounce);
      state.email = null;
      setMessage('email', null);
      emailDebounce = setTimeout(checkEmail, 450);
    });
    fields.username.input().addEventListener('input', () => {
      clearTimeout(usernameDebounce);
      state.username = null;
      setMessage('username', null);
      usernameDebounce = setTimeout(checkUsername, 450);
    });
    fields.password.input().addEventListener('input', checkPassword);
    fields.passwordConfirm.input().addEventListener('input', checkPasswordConfirm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearTimeout(emailDebounce);
    clearTimeout(usernameDebounce);

    // 送出前一定要把四個欄位都重新驗證一次（使用者可能沒觸發過 blur/debounce 就直接按送出）。
    await Promise.all([checkEmail(), checkUsername()]);
    checkPassword();

    const invalidField = ['email', 'username', 'password', 'passwordConfirm'].find(key => state[key]);
    if (invalidField) { fields[invalidField].input().focus(); return; }

    const submitButton = $('submit-register');
    const formMessage = $('form-message');
    submitButton.disabled = true;
    submitButton.textContent = t('submitting');
    formMessage.textContent = '';
    formMessage.dataset.tone = '';

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email.input().value.trim(),
          username: fields.username.input().value.trim(),
          password: fields.password.input().value,
        }),
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        formMessage.textContent = t('registerSuccess');
        formMessage.dataset.tone = 'success';
        $('register-form').reset();
        renderPasswordStrength('');
        await window.FiresideAccount.refresh();
        showSignedInState(data.user);
        return;
      }

      if (data.fields) {
        if (data.fields.email) { state.email = data.fields.email === 'taken' ? 'errEmailTaken' : 'errEmailFormat'; setMessage('email', state.email); }
        if (data.fields.username) { state.username = data.fields.username === 'taken' ? 'errUsernameTaken' : 'errUsernameFormat'; setMessage('username', state.username); }
        if (data.fields.password) { setMessage('password', 'errPasswordTooWeak'); }
        formMessage.textContent = '';
      } else {
        formMessage.textContent = t('registerServerError');
        formMessage.dataset.tone = 'error';
      }
    } catch {
      formMessage.textContent = t('registerServerError');
      formMessage.dataset.tone = 'error';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = t('submitRegister');
    }
  }

  function showSignedInState(user) {
    $('register-form').hidden = true;
    $('register-signed-in').hidden = false;
    const text = $('register-signed-in-text');
    if (text) text.textContent = `${t('alreadyLoggedInBefore')}${user.username}${t('alreadyLoggedInAfter')}`;
  }

  function showFormState() {
    $('register-form').hidden = false;
    $('register-signed-in').hidden = true;
  }

  async function handleLogout() {
    const button = $('register-logout');
    button.disabled = true;
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch { /* 就算 API 打不到，還是讓畫面回到表單狀態 */ }
    await window.FiresideAccount.refresh();
    showFormState();
    button.disabled = false;
  }

  // 頁面上所有寫死的中文文字，語言切換時要重新套用一次。
  function applyRegisterUI() {
    document.title = `${t('registerHeading')} | ${t('brand')}`;
    $('register-heading').textContent = t('registerHeading');
    $('register-intro').textContent = t('registerIntro');
    $('label-email').textContent = t('fieldEmail');
    $('label-username').textContent = t('fieldUsername');
    $('label-password').textContent = t('fieldPassword');
    $('label-password-confirm').textContent = t('fieldPasswordConfirm');
    $('hint-username').textContent = t('usernameHint');
    $('hint-password').textContent = t('passwordHint');
    $('submit-register').textContent = t('submitRegister');
    $('register-go-home').textContent = t('goToHome');
    $('register-logout').textContent = t('logout');
    if ($('already-have-account')) $('already-have-account').textContent = t('alreadyHaveAccount');
    if ($('go-to-login')) $('go-to-login').textContent = t('goToLogin');
    // 已經顯示出來的驗證訊息（不管是成功還是錯誤）都要換成新語言的文字。
    for (const key of Object.keys(fields)) rerenderFieldMessage(key);
    renderPasswordStrength(fields.password.input().value);
    // I18n.applyUI() 只認得「跳至卡牌庫」這種首頁通用文字，這裡蓋回註冊頁專屬的版本。
    const skip = document.querySelector('.skip');
    if (skip) skip.textContent = t('skipToRegister');
    const section = document.querySelector('.register');
    if (section) section.setAttribute('aria-label', t('registerHeading'));
    const user = window.FiresideAccount && window.FiresideAccount.user;
    if (user) showSignedInState(user);
  }

  function init() {
    I18n.applyUI();
    applyRegisterUI();
    bindLiveValidation();
    $('register-form').addEventListener('submit', handleSubmit);
    $('register-logout').addEventListener('click', handleLogout);
    if ($('language')) {
      // 語言切換時，除了這頁自己的文字，也要重新呼叫 I18n.applyUI()，
      // 不然導覽列／Logo／頁尾這些「共用」文字不會跟著切換語言。
      $('language').addEventListener('change', () => {
        I18n.applyUI();
        applyRegisterUI();
      });
    }
    document.addEventListener('fireside-account-ready', event => {
      if (event.detail.user) showSignedInState(event.detail.user);
      else showFormState();
    });
  }

  init();
})();
