'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const I18n = window.CardI18n;
  const texts = {
    'zh-TW': ['忘記密碼', '重設密碼', '輸入註冊時使用的 Email，我們會寄送重設連結。', '新密碼需為 8～72 碼，且包含英文字母與數字。', 'Email', '新密碼', '確認新密碼', '寄送重設連結', '更新密碼', '返回登入', '若此 Email 已註冊，我們會寄送重設連結。請查看收件匣與垃圾郵件；再次申請請等候一分鐘。', '密碼已更新，請使用新密碼登入。', '連結已失效或已使用，請重新申請。', '密碼需為 8～72 碼，且包含英文字母與數字。', '兩次輸入的密碼不一致。', '服務暫時無法使用，請稍後再試。', '處理中…'],
    en: ['Forgot password', 'Reset password', 'Enter your registered email to request a reset link.', 'Use 8–72 characters including letters and numbers.', 'Email', 'New password', 'Confirm new password', 'Send reset link', 'Update password', 'Back to login', 'If this email is registered, we will send a reset link. Check your inbox and spam folder. Wait one minute before requesting again.', 'Password updated. Sign in with your new password.', 'This link has expired or was used. Request a new link.', 'Use 8–72 characters including letters and numbers.', 'Passwords do not match.', 'Service unavailable. Please try again later.', 'Processing…'],
    ja: ['パスワードを忘れた方', 'パスワードの再設定', '登録したメールアドレスを入力してください。', '英字と数字を含む8～72文字で入力してください。', 'メールアドレス', '新しいパスワード', '新しいパスワードの確認', '再設定リンクを送信', 'パスワードを更新', 'ログインに戻る', '登録済みの場合、再設定リンクを送信します。迷惑メールも確認してください。再申請は1分後にできます。', '更新しました。新しいパスワードでログインしてください。', 'リンクが無効または使用済みです。再申請してください。', '英字と数字を含む8～72文字で入力してください。', 'パスワードが一致しません。', '現在利用できません。後でもう一度お試しください。', '処理中…'],
    ko: ['비밀번호 찾기', '비밀번호 재설정', '가입한 이메일 주소를 입력하세요.', '영문자와 숫자를 포함하여 8~72자로 입력하세요.', '이메일', '새 비밀번호', '새 비밀번호 확인', '재설정 링크 보내기', '비밀번호 변경', '로그인으로 돌아가기', '등록된 이메일이면 재설정 링크를 보냅니다. 스팸함도 확인하세요. 재요청은 1분 후 가능합니다.', '변경되었습니다. 새 비밀번호로 로그인하세요.', '만료되었거나 사용된 링크입니다. 다시 요청하세요.', '영문자와 숫자를 포함하여 8~72자로 입력하세요.', '비밀번호가 일치하지 않습니다.', '현재 사용할 수 없습니다. 나중에 다시 시도하세요.', '처리 중…'],
  };
  const reset = $('recovery-form').dataset.mode === 'reset';
  let token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  if (reset) history.replaceState(null, '', location.pathname + location.search);
  let busy = false;
  let done = false;
  let message = null;
  const words = () => texts[I18n.language] || texts['zh-TW'];
  function render() {
    I18n.applyUI();
    const w = words();
    document.title = `${w[reset ? 1 : 0]} | ${I18n.t('brand')}`;
    $('login-heading').textContent = w[reset ? 1 : 0];
    $('login-intro').textContent = w[reset ? 3 : 2];
    document.querySelector('.register').setAttribute('aria-label', w[reset ? 1 : 0]);
    document.querySelector('.skip').textContent = w[reset ? 1 : 0];
    $('recovery-label').textContent = w[reset ? 5 : 4];
    if (reset) $('confirm-label').textContent = w[6];
    $('recovery-submit').textContent = w[busy ? 16 : reset ? 8 : 7];
    $('recovery-submit').disabled = busy || done || (reset && !token);
    $('back-login').textContent = w[9];
    $('recovery-message').textContent = message === null ? '' : w[message];
  }
  if (reset && !/^[A-Za-z0-9_-]{43}$/.test(token)) { token = ''; message = 12; }
  $('recovery-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || done || (reset && !token)) return;
    const value = $('recovery-input').value;
    if (reset && (value.length < 8 || value.length > 72 || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value))) { message = 13; render(); return; }
    if (reset && value !== $('confirm-password').value) { message = 14; render(); return; }
    busy = true; message = null; render();
    try {
      const response = await fetch(`/api/${reset ? 'reset' : 'forgot'}-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reset ? { token, password: value } : { email: value.trim() }),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        message = reset ? 11 : 10;
        if (reset) { done = true; token = ''; $('recovery-form').reset(); if (window.FiresideAccount) await window.FiresideAccount.refresh(); }
      } else {
        message = data.error === 'invalid-token' ? 12 : reset && data.error === 'validation-failed' ? 13 : 15;
        if (message === 12) token = '';
      }
    } catch { message = 15; }
    finally { busy = false; render(); }
  });
  $('language').addEventListener('change', render);
  render();
})();
